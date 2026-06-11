"""FastAPI 推理服务：加载模型仓里的 DC 模型，对外出比分概率 / 排名 / 赛会模拟。

启动时从 ModelStore 载入 latest 模型；若仓库为空，自动落一个合成兜底模型保证服务可用
（合成队名 T01.. 仅供契约自测，真实模型用 `wcpredict train` 注册）。
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
import time

import numpy as np
from fastapi import FastAPI, Header, HTTPException, Request

from wcpredict.markets import summarize_match
from wcpredict.model.dixon_coles import DixonColesModel
from wcpredict.registry import ModelStore
from wcpredict.service.schemas import (
    HealthResponse,
    MatchPrediction,
    MatchRequest,
    PortalMeta,
    PortalOddsEntry,
    PortalResponse,
    RankingEntry,
    RankingsResponse,
    TeamProb,
    TopScore,
    TournamentResponse,
)
from wcpredict.tournament import TournamentSimulator, snake_draw_groups
from wcpredict.tournament.wc2026 import OfficialWC2026Simulator


def _ensure_model(store: ModelStore):
    """载入 latest 模型；仓库为空则落合成兜底模型。"""
    try:
        return store.load("default")
    except FileNotFoundError:
        from wcpredict.data.synthetic import generate_true_params
        params = generate_true_params(n_teams=48, seed=2026)
        store.save(params, name="default", metadata={
            "source": "synthetic-fallback",
            "note": "仓库为空时自动生成的合成兜底模型；真实模型请用 wcpredict train 注册",
            "n_teams": 48,
        })
        return store.load("default")


@asynccontextmanager
async def lifespan(app: FastAPI):
    store = ModelStore()
    loaded = _ensure_model(store)
    app.state.store = store
    app.state.loaded = loaded
    app.state.model = DixonColesModel(loaded.params)
    app.state.tournament_cache = {}
    app.state.rate_limit = {}
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="wcpredict 推理服务",
        description="可解释的世界杯比分概率：单场盘口派生 + 赛会 Monte Carlo",
        version="0.1.0",
        lifespan=lifespan,
    )

    @app.get("/")
    def root():
        return {
            "service": "wcpredict",
            "endpoints": ["/health", "/rankings", "POST /predict", "/tournament", "/portal", "/docs"],
        }

    def _rankings_response(top: int = 20) -> RankingsResponse:
        ld = app.state.loaded
        p = ld.params
        top = max(1, min(top, len(p.teams)))
        strength = p.attack - p.defence
        order = np.argsort(-strength)
        entries = [
            RankingEntry(rank=i + 1, team=p.teams[idx], strength=float(strength[idx]))
            for i, idx in enumerate(order[:top])
        ]
        return RankingsResponse(
            model_name=ld.name, version=ld.version, n_teams=len(p.teams), teams=entries
        )

    def _predict_match(home: str, away: str, *, neutral: bool = True) -> MatchPrediction:
        p = app.state.model.params
        for t in (home, away):
            if t not in p.index:
                raise HTTPException(404, f"未知球队 '{t}'，可用球队见 /rankings?top=999")
        lam, mu = p.lambdas(home, away, neutral=neutral)
        M = app.state.model.predict_matrix(home, away, neutral=neutral)
        s = summarize_match(M)
        o = s["1x2"]
        return MatchPrediction(
            home=home, away=away, neutral=neutral,
            lambda_home=round(lam, 4), lambda_away=round(mu, 4),
            prob_home=o["home"], prob_draw=o["draw"], prob_away=o["away"],
            over_2_5=s["over_under"][2.5]["over"], under_2_5=s["over_under"][2.5]["under"],
            btts_yes=s["btts"]["yes"],
            top_scores=[TopScore(score=f"{x}:{y}", prob=pr) for (x, y), pr in s["top_scores"]],
            xg_home=s["expected_goals"]["home"], xg_away=s["expected_goals"]["away"],
        )

    def _check_tournament_rate_limit(request: Request, sims: int) -> None:
        """Small abuse guard for public demos; normal cached reads stay untouched."""
        if sims < 50_000:
            return
        host = request.client.host if request.client else "unknown"
        now = time.monotonic()
        bucket = [t for t in app.state.rate_limit.get(host, []) if now - t < 60]
        if len(bucket) >= 12:
            raise HTTPException(429, "赛会模拟请求过于频繁，请稍后再试")
        bucket.append(now)
        app.state.rate_limit[host] = bucket

    def _tournament_response(sims: int = 20000, top: int = 20, seed: int = 2026) -> TournamentResponse:
        sims = max(1, min(sims, 200_000))           # 防滥用：钳制模拟次数上限
        loaded = app.state.loaded
        p = app.state.model.params
        top = max(1, min(top, len(p.teams)))
        if len(p.teams) < 48:
            raise HTTPException(
                400, f"当前模型仅 {len(p.teams)} 队，赛会模拟需要 ≥48 队（用 national 模型）"
            )
        cache = app.state.tournament_cache
        tournament_format = loaded.metadata.get("format", "seeded_top48")
        key = (loaded.name, loaded.version, tournament_format, sims, seed)
        if key not in cache:
            if tournament_format == "wc2026_official":
                res = OfficialWC2026Simulator(p).run(n_sims=sims, seed=seed)
            else:
                strength = {t: float(p.attack[i] - p.defence[i]) for i, t in enumerate(p.teams)}
                ranked = sorted(strength, key=strength.get, reverse=True)[:48]
                groups = snake_draw_groups(ranked)
                res = TournamentSimulator(p, groups).run(n_sims=sims, seed=seed)
            cache[key] = res.probs
        probs = cache[key].head(top)
        teams = [
            TeamProb(
                team=t, advance=float(r["advance"]), reach_qf=float(r["reach_QF"]),
                reach_sf=float(r["reach_SF"]), reach_final=float(r["reach_Final"]),
                champion=float(r["champion"]),
            )
            for t, r in probs.iterrows()
        ]
        return TournamentResponse(n_sims=sims, seed=seed, teams=teams)

    def _featured_matches(rankings: RankingsResponse, limit: int = 3) -> list[MatchPrediction]:
        teams = [x.team for x in rankings.teams]
        pairs = [(teams[i], teams[i + 1]) for i in range(0, min(len(teams) - 1, limit * 2), 2)]
        return [_predict_match(home, away, neutral=True) for home, away in pairs]

    @app.get("/health", response_model=HealthResponse)
    def health():
        ld = app.state.loaded
        return HealthResponse(
            status="ok", model_name=ld.name, version=ld.version,
            n_teams=len(ld.params.teams), metadata=ld.metadata,
        )

    @app.get("/rankings", response_model=RankingsResponse)
    def rankings(top: int = 20):
        return _rankings_response(top=top)

    @app.post("/predict", response_model=MatchPrediction)
    def predict(req: MatchRequest):
        return _predict_match(req.home, req.away, neutral=req.neutral)

    @app.post("/reload")
    def reload_model(x_reload_token: str | None = Header(default=None)):
        """热加载模型仓 latest（train 注册新版本后无需重启服务）。"""
        expected = os.getenv("WCPREDICT_RELOAD_TOKEN")
        if expected and x_reload_token != expected:
            raise HTTPException(403, "reload token missing or invalid")
        loaded = _ensure_model(app.state.store)
        app.state.loaded = loaded
        app.state.model = DixonColesModel(loaded.params)
        app.state.tournament_cache = {}
        return {"status": "reloaded", "model_name": loaded.name,
                "version": loaded.version, "n_teams": len(loaded.params.teams)}

    @app.get("/tournament", response_model=TournamentResponse)
    def tournament(request: Request, sims: int = 20000, top: int = 20, seed: int = 2026):
        sims = max(1, min(sims, 200_000))
        _check_tournament_rate_limit(request, sims)
        return _tournament_response(sims=sims, top=top, seed=seed)

    @app.get("/portal", response_model=PortalResponse)
    def portal(sims: int = 20000, top: int = 48, seed: int = 2026):
        """Aggregate endpoint for the static portal live-hydration layer."""
        loaded = app.state.loaded
        rankings_body = _rankings_response(top=top)
        tournament_body = _tournament_response(sims=sims, top=top, seed=seed)
        model_probs = {t.team: t.champion for t in tournament_body.teams}
        odds_cmp = [
            PortalOddsEntry(team=team, model=prob, market=None, edge=None)
            for team, prob in model_probs.items()
        ]
        return PortalResponse(
            meta=PortalMeta(
                generated_at=datetime.now(timezone.utc).isoformat(),
                model_name=loaded.name,
                version=loaded.version,
                n_teams=len(loaded.params.teams),
                metadata=loaded.metadata,
            ),
            rankings=rankings_body,
            tournament=tournament_body,
            featured_matches=_featured_matches(rankings_body),
            odds_cmp=odds_cmp,
            bracket=None,
        )

    return app


app = create_app()
