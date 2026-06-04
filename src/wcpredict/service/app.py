"""FastAPI 推理服务：加载模型仓里的 DC 模型，对外出比分概率 / 排名 / 赛会模拟。

启动时从 ModelStore 载入 latest 模型；若仓库为空，自动落一个合成兜底模型保证服务可用
（合成队名 T01.. 仅供契约自测，真实模型用 `wcpredict train` 注册）。
"""
from __future__ import annotations

from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, HTTPException

from wcpredict.markets import summarize_match
from wcpredict.model.dixon_coles import DixonColesModel
from wcpredict.registry import ModelStore
from wcpredict.service.schemas import (
    HealthResponse,
    MatchPrediction,
    MatchRequest,
    RankingEntry,
    RankingsResponse,
    TeamProb,
    TopScore,
    TournamentResponse,
)
from wcpredict.tournament import TournamentSimulator, snake_draw_groups


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
            "endpoints": ["/health", "/rankings", "POST /predict", "/tournament", "/docs"],
        }

    @app.get("/health", response_model=HealthResponse)
    def health():
        ld = app.state.loaded
        return HealthResponse(
            status="ok", model_name=ld.name, version=ld.version,
            n_teams=len(ld.params.teams), metadata=ld.metadata,
        )

    @app.get("/rankings", response_model=RankingsResponse)
    def rankings(top: int = 20):
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

    @app.post("/predict", response_model=MatchPrediction)
    def predict(req: MatchRequest):
        p = app.state.model.params
        for t in (req.home, req.away):
            if t not in p.index:
                raise HTTPException(404, f"未知球队 '{t}'，可用球队见 /rankings?top=999")
        lam, mu = p.lambdas(req.home, req.away, neutral=req.neutral)
        M = app.state.model.predict_matrix(req.home, req.away, neutral=req.neutral)
        s = summarize_match(M)
        o = s["1x2"]
        return MatchPrediction(
            home=req.home, away=req.away, neutral=req.neutral,
            lambda_home=round(lam, 4), lambda_away=round(mu, 4),
            prob_home=o["home"], prob_draw=o["draw"], prob_away=o["away"],
            over_2_5=s["over_under"][2.5]["over"], under_2_5=s["over_under"][2.5]["under"],
            btts_yes=s["btts"]["yes"],
            top_scores=[TopScore(score=f"{x}:{y}", prob=pr) for (x, y), pr in s["top_scores"]],
            xg_home=s["expected_goals"]["home"], xg_away=s["expected_goals"]["away"],
        )

    @app.post("/reload")
    def reload_model():
        """热加载模型仓 latest（train 注册新版本后无需重启服务）。"""
        loaded = _ensure_model(app.state.store)
        app.state.loaded = loaded
        app.state.model = DixonColesModel(loaded.params)
        app.state.tournament_cache = {}
        return {"status": "reloaded", "model_name": loaded.name,
                "version": loaded.version, "n_teams": len(loaded.params.teams)}

    @app.get("/tournament", response_model=TournamentResponse)
    def tournament(sims: int = 20000, top: int = 20, seed: int = 2026):
        sims = max(1, min(sims, 200_000))           # 防滥用：钳制模拟次数上限
        p = app.state.model.params
        top = max(1, min(top, len(p.teams)))
        if len(p.teams) < 48:
            raise HTTPException(
                400, f"当前模型仅 {len(p.teams)} 队，赛会模拟需要 ≥48 队（用 national 模型）"
            )
        cache = app.state.tournament_cache
        key = (app.state.loaded.version, sims, seed)
        if key not in cache:
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

    return app


app = create_app()
