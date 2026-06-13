"""冻结世界杯 2026 赛前 per-fixture 预测（ex-ante，写一次不覆盖）。

铁律 #1：所有盘口从同一个 Dixon-Coles 比分矩阵派生（markets.derive.summarize_match）。
铁律 #4：预测必须 ex-ante——本脚本用注册仓部署模型（default latest，wc2026_official），
        其训练数据 cutoff 远早于开赛（last real result ≤ 2026-06-02，开赛 2026-06-11），
        且世界杯比分在训练数据里是 NA（martj42 占位行被 validate 丢弃），无泄漏。

链路：registry latest（= 线上 engine.js 同一模型，WC_PARAMS 同源）
      → DixonColesModel(params).predict_matrix(home, away, neutral=True)
      → summarize_match → 1X2 / 期望进球 / 最可能比分 / 大小球 2.5 / BTTS
      → data/wc2026_predictions_frozen.json（committed，可审计）

只覆盖小组赛 72 场（对阵在赛前已知）；淘汰赛对阵未定，开赛后由 score 脚本增量补。
赛程来源：缓存的 data/raw/international_results.csv（martj42 占位 schedule，离线可复现）。
**写一次**：文件已存在则拒绝覆盖（保 ex-ante 纪律），除非 --force。

用法：PYTHONPATH=src python scripts/freeze_predictions.py [--force]
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "src"))

from wcpredict.config import DATA_DIR                                          # noqa: E402
from wcpredict.markets.derive import summarize_match                          # noqa: E402
from wcpredict.model.dixon_coles import DixonColesModel                       # noqa: E402
from wcpredict.registry import ModelStore                                     # noqa: E402
from wcpredict.tournament.wc2026 import GROUPS_2026                           # noqa: E402

# 复用 export_portal_data 的展示元数据（中文名/旗/洲际），避免重复维护
_spec = importlib.util.spec_from_file_location("_epd", REPO / "scripts/export_portal_data.py")
_epd = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_epd)  # 顶层只定义字典，main() 由 __main__ 守卫，import 安全
ZH, FLAGS, CONF_OF = _epd.ZH, _epd.FLAGS, _epd.CONF_OF

GROUP_OF = {t: g for g, ts in GROUPS_2026.items() for t in ts}
OFFICIAL = set(GROUP_OF)
FROZEN_CACHE = DATA_DIR / "raw" / "international_results.csv"
OUT_JSON = DATA_DIR / "wc2026_predictions_frozen.json"


def data_cutoff(cache: pd.DataFrame) -> str:
    """训练数据真实 cutoff = 缓存里最后一场有真实比分的国际赛日期。"""
    real = cache[cache["home_score"].notna() & (cache["home_score"].astype(str) != "NA")]
    return str(pd.to_datetime(real["date"], errors="coerce").max().date())


def group_fixtures(cache: pd.DataFrame) -> pd.DataFrame:
    """从缓存 schedule 取 WC2026 小组赛对阵（两队都在官方 48 队 = 排除淘汰赛占位）。"""
    wc = cache[(cache["tournament"] == "FIFA World Cup")
               & (cache["date"].astype(str).str.startswith("2026"))].copy()
    wc = wc[wc["home_team"].isin(OFFICIAL) & wc["away_team"].isin(OFFICIAL)]
    wc = wc.drop_duplicates(subset=["date", "home_team", "away_team"])
    return wc.sort_values("date").reset_index(drop=True)


def predict_fixture(model: DixonColesModel, home: str, away: str) -> dict:
    """单场全盘口派生（neutral=True，与线上 MatchPredictor / 锦标赛模拟同口径）。"""
    lh, la = model.params.lambdas(home, away, neutral=True)
    M = model.predict_matrix(home, away, neutral=True)
    s = summarize_match(M, ou_lines=(2.5,), ah_lines=(0.0,), top_n=5)
    x = s["1x2"]
    pick = max(("home", "draw", "away"), key=lambda k: x[k])
    (ms, msp) = s["top_scores"][0]
    # 条件最可能比分：在预测结果(pick)对应区域内取概率最大的格 —— 比全局 argmax(常年 1-1)更随对阵变化
    xs, ys = np.indices(M.shape)
    region = (xs > ys) if pick == "home" else (xs < ys) if pick == "away" else (xs == ys)
    Mr = np.where(region, M, -1.0)
    pi, pj = np.unravel_index(int(np.argmax(Mr)), M.shape)
    return {
        "lambda_home": round(lh, 3), "lambda_away": round(la, 3),
        "p_home": round(x["home"], 4), "p_draw": round(x["draw"], 4), "p_away": round(x["away"], 4),
        "pick": pick, "pick_conf": round(x[pick], 4),
        "exp_home": round(s["expected_goals"]["home"], 3),
        "exp_away": round(s["expected_goals"]["away"], 3),
        "exp_total": round(s["expected_goals"]["total"], 3),
        "modal_score": [int(ms[0]), int(ms[1])], "modal_prob": round(float(msp), 4),
        "pred_score": [int(pi), int(pj)], "pred_score_prob": round(float(M[pi, pj]), 4),
        "top_scores": [[[int(a), int(b)], round(float(p), 4)] for (a, b), p in s["top_scores"]],
        "over25": round(s["over_under"][2.5]["over"], 4),
        "btts": round(s["btts"]["yes"], 4),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="覆盖已有冻结文件（破坏 ex-ante 纪律，慎用）")
    args = ap.parse_args()

    if OUT_JSON.exists() and not args.force:
        existing = json.loads(OUT_JSON.read_text())
        meta = existing.get("meta", {})
        print(f"⛔ 冻结文件已存在（{OUT_JSON.name}）：model v{meta.get('model_version')} · "
              f"frozen {meta.get('freeze_time')} · {len(existing.get('fixtures', []))} 场。")
        print("   ex-ante 纪律：不覆盖。如确需重冻结用 --force。")
        return 0

    if not FROZEN_CACHE.exists():
        raise SystemExit(f"缺缓存 schedule：{FROZEN_CACHE}（先跑一次 ingest/national 让它落地）")
    cache = pd.read_csv(FROZEN_CACHE)

    loaded = ModelStore().load("default")
    meta = loaded.metadata
    if str(meta.get("format")) != "wc2026_official":
        raise SystemExit(f"注册仓 latest 不是 wc2026_official（format={meta.get('format')}）")
    model = DixonColesModel(loaded.params)
    cutoff = data_cutoff(cache)
    print(f"模型 default v{loaded.version} · fit {meta.get('fit_time')} · 数据 cutoff {cutoff} · {len(loaded.params.teams)} 队")

    fx = group_fixtures(cache)
    print(f"小组赛对阵：{len(fx)} 场（应为 72）")

    fixtures = []
    for _, r in fx.iterrows():
        h, a = r["home_team"], r["away_team"]
        if h not in loaded.params.index or a not in loaded.params.index:
            raise SystemExit(f"❌ 队名失配（模型无此队）：{h} vs {a} —— 修队名映射后再冻结")
        g = GROUP_OF[h]
        if GROUP_OF[a] != g:
            raise SystemExit(f"❌ 同场两队不同组：{h}({g}) vs {a}({GROUP_OF[a]}) —— schedule 异常")
        pred = predict_fixture(model, h, a)
        fixtures.append({
            "date": str(pd.to_datetime(r["date"]).date()),
            "group": g, "home": h, "away": a,
            "home_zh": ZH.get(h, h), "away_zh": ZH.get(a, a),
            "home_flag": FLAGS.get(h, "🏳"), "away_flag": FLAGS.get(a, "🏳"),
            "neutral_venue": bool(str(r.get("neutral", "TRUE")).upper() == "TRUE"),
            **pred,
        })

    # 自检：概率守恒 + 期望进球与 λ 自洽
    for f in fixtures:
        assert abs(f["p_home"] + f["p_draw"] + f["p_away"] - 1.0) < 1e-3, f"1X2 不归一 {f['home']}"

    out = {
        "meta": {
            "model_version": loaded.version,
            "model_fit_time": meta.get("fit_time"),
            "data_cutoff": cutoff,                    # 训练数据最后真实比分日（审计 ex-ante 用）
            "kickoff": "2026-06-11",
            "freeze_time": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "neutral_policy": "all matches neutral=True（与线上 MatchPredictor / 锦标赛模拟同口径；东道主主场加成未建模）",
            "elo_passes": meta.get("elo_passes"), "since": meta.get("since"),
            "n_fixtures": len(fixtures),
            "scope": "group stage only（淘汰赛对阵未定，开赛后增量）",
            "source": "registry default latest（= 线上 engine.js WC_PARAMS 同源）",
        },
        "fixtures": fixtures,
    }
    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ 冻结 {len(fixtures)} 场 → {OUT_JSON}")
    # 抽样打印
    for f in fixtures[:4]:
        print(f"  {f['date']} {f['home']} vs {f['away']}: "
              f"H{f['p_home']:.0%}/D{f['p_draw']:.0%}/A{f['p_away']:.0%} "
              f"最可能 {f['modal_score'][0]}-{f['modal_score'][1]} pick={f['pick']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
