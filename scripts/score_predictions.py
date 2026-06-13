"""用真实赛果给冻结预测打分（开赛后准确率追踪）。

输入：
  - data/wc2026_predictions_frozen.json（freeze_predictions.py 产出，ex-ante）
  - 真实赛果：martj42 实时 CSV（canonical，自动更新）∪ data/wc2026_results_manual.json（补 martj42 未 ingest）
输出：
  - data/wc2026_accuracy.json（committed，全量审计）
  - site/portal/assets/accuracy.js（window.WC_ACCURACY；门户「战报」tab 读取）
  - 终端打印 markdown 战报摘要

纪律：
  - 实时 CSV 下到 repo 外 ~/FootballData/，**绝不**覆盖训练缓存 data/raw/international_results.csv。
  - join 用 (date,home,away) 严格匹配，失配 fail-loud（打印未匹配行），不静默丢弃。
  - 概率指标走 wcpredict.metrics.calibration（与回测同实现）。
  - 小样本：n<16 时 summary.indicative=True，UI 据此把指标置灰为「指示性·样本不足」。

用法：PYTHONPATH=src python scripts/score_predictions.py
"""
from __future__ import annotations

import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "src"))

from wcpredict.config import DATA_DIR                                          # noqa: E402
from wcpredict.metrics.calibration import brier_score, log_loss               # noqa: E402

FROZEN = DATA_DIR / "wc2026_predictions_frozen.json"
MANUAL = DATA_DIR / "wc2026_results_manual.json"
OUT_JSON = DATA_DIR / "wc2026_accuracy.json"
OUT_JS = REPO / "site" / "portal" / "assets" / "accuracy.js"
LIVE_CACHE = Path.home() / "FootballData" / "wc2026_live_results.csv"   # repo 外，不碰训练缓存
MARTJ42_URL = "https://raw.githubusercontent.com/martj42/international_results/master/results.csv"
_UA = "Mozilla/5.0 (wcpredict accuracy tracker)"
SMALL_N = 16  # 低于此样本量，指标仅作指示性

# 名称归一：把常见 Web/别名口径统一到 martj42
NAME_FIX = {
    "USA": "United States", "Czechia": "Czech Republic", "Türkiye": "Turkey",
    "Turkiye": "Turkey", "Korea Republic": "South Korea", "Cote d'Ivoire": "Ivory Coast",
    "Côte d'Ivoire": "Ivory Coast", "Bosnia": "Bosnia and Herzegovina", "Curacao": "Curaçao",
}


def fix_name(n: str) -> str:
    return NAME_FIX.get(str(n).strip(), str(n).strip())


def fetch_martj42_results() -> pd.DataFrame:
    """实时 martj42 → 已完赛 WC2026（repo 外缓存，force 刷新）。网络失败回退已有缓存。"""
    LIVE_CACHE.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(MARTJ42_URL, headers={"User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=40) as r:  # noqa: S310
            LIVE_CACHE.write_bytes(r.read())
        print(f"  martj42 实时拉取 OK → {LIVE_CACHE}")
    except Exception as e:  # noqa: BLE001
        if LIVE_CACHE.exists():
            print(f"  ⚠ martj42 拉取失败（{e}），用既有缓存 {LIVE_CACHE}")
        else:
            print(f"  ⚠ martj42 拉取失败且无缓存（{e}），仅用 manual")
            return pd.DataFrame(columns=["date", "home", "away", "home_goals", "away_goals", "source"])
    df = pd.read_csv(LIVE_CACHE)
    wc = df[(df["tournament"] == "FIFA World Cup") & (df["date"].astype(str).str.startswith("2026"))].copy()
    wc = wc[wc["home_score"].notna() & wc["away_score"].notna()
            & (wc["home_score"].astype(str) != "NA")]
    if wc.empty:
        return pd.DataFrame(columns=["date", "home", "away", "home_goals", "away_goals", "source"])
    return pd.DataFrame({
        "date": pd.to_datetime(wc["date"]).dt.strftime("%Y-%m-%d"),
        "home": wc["home_team"].map(fix_name), "away": wc["away_team"].map(fix_name),
        "home_goals": wc["home_score"].astype(int), "away_goals": wc["away_score"].astype(int),
        "source": "martj42",
    })


def load_manual() -> pd.DataFrame:
    if not MANUAL.exists():
        return pd.DataFrame(columns=["date", "home", "away", "home_goals", "away_goals", "source"])
    rows = json.loads(MANUAL.read_text()).get("results", [])
    if not rows:
        return pd.DataFrame(columns=["date", "home", "away", "home_goals", "away_goals", "source"])
    df = pd.DataFrame(rows)
    df["home"] = df["home"].map(fix_name)
    df["away"] = df["away"].map(fix_name)
    df["source"] = df.get("source", "manual")
    return df[["date", "home", "away", "home_goals", "away_goals", "source"]]


def gather_results() -> pd.DataFrame:
    """martj42（canonical）∪ manual，按 (date,home,away) 去重，martj42 优先。"""
    m, man = fetch_martj42_results(), load_manual()
    both = pd.concat([m, man], ignore_index=True)
    if both.empty:
        return both
    both["_k"] = both["date"] + "|" + both["home"] + "|" + both["away"]
    # martj42 优先：稳定排序让 martj42 排前，drop_duplicates(keep='first')
    both["_pri"] = (both["source"] != "martj42").astype(int)
    both = both.sort_values("_pri").drop_duplicates(subset="_k", keep="first")
    return both.drop(columns=["_k", "_pri"]).reset_index(drop=True)


def outcome_idx(hg: int, ag: int) -> int:
    return 0 if hg > ag else (1 if hg == ag else 2)


def main() -> int:
    if not FROZEN.exists():
        raise SystemExit(f"缺冻结预测：{FROZEN}（先跑 freeze_predictions.py）")
    frozen = json.loads(FROZEN.read_text())
    fmeta = frozen["meta"]
    preds = {(f["date"], f["home"], f["away"]): f for f in frozen["fixtures"]}

    print("拉取真实赛果…")
    results = gather_results()
    print(f"  已完赛（WC2026 小组赛口径）：{len(results)} 场")

    # ---- fail-loud join ----
    matched, unmatched = [], []
    for _, r in results.iterrows():
        key = (r["date"], r["home"], r["away"])
        if key in preds:
            matched.append((preds[key], r))
        else:
            unmatched.append(key)
    if unmatched:
        print("  ⚠ 以下真实赛果未匹配到冻结预测（队名/日期口径不一致，需人工核）：")
        for k in unmatched:
            print(f"     {k}")
        # 仅小组赛冻结；淘汰赛赛果暂无预测 → 未匹配可能是淘汰赛，记录但不致命
    if not matched:
        print("  尚无可打分场次（martj42 可能滞后 1–2 天，manual 未配）。写空战报。")

    rows, P, Y = [], [], []
    exact_hits = ou_correct = btts_correct = pick_correct = 0
    tot_goal_abs = 0.0
    for f, r in matched:
        hg, ag = int(r["home_goals"]), int(r["away_goals"])
        oc = outcome_idx(hg, ag)
        p = [f["p_home"], f["p_draw"], f["p_away"]]
        P.append(p); Y.append(oc)
        pick_ok = (["home", "draw", "away"][int(np.argmax(p))] == ["home", "draw", "away"][oc])
        pick_correct += pick_ok
        exact_ok = (f["modal_score"] == [hg, ag])
        exact_hits += exact_ok
        actual_total = hg + ag
        ou_ok = ((f["over25"] >= 0.5) == (actual_total > 2.5))
        ou_correct += ou_ok
        btts_actual = (hg > 0 and ag > 0)
        btts_ok = ((f["btts"] >= 0.5) == btts_actual)
        btts_correct += btts_ok
        tot_goal_abs += abs(f["exp_total"] - actual_total)
        rows.append({
            "date": f["date"], "group": f["group"],
            "home": f["home"], "away": f["away"],
            "home_zh": f["home_zh"], "away_zh": f["away_zh"],
            "home_flag": f["home_flag"], "away_flag": f["away_flag"],
            "p_home": f["p_home"], "p_draw": f["p_draw"], "p_away": f["p_away"],
            "pick": f["pick"], "pick_conf": f["pick_conf"],
            "modal_score": f["modal_score"], "exp_total": f["exp_total"],
            "exp_home": f["exp_home"], "exp_away": f["exp_away"],
            "pred_score": f.get("pred_score", f["modal_score"]),
            "top3": f["top_scores"][:3],
            "in_top3": bool([hg, ag] in [s[0] for s in f["top_scores"][:3]]),
            "over25": f["over25"], "btts_pred": f["btts"],
            "home_goals": hg, "away_goals": ag,
            "outcome": ["home", "draw", "away"][oc],
            "prob_actual": round(p[oc], 4),          # 模型给真实结果的概率（越高越准）
            "pick_correct": bool(pick_ok),
            "exact_correct": bool(exact_ok),
            "ou_correct": bool(ou_ok), "btts_correct": bool(btts_ok),
            "surprisal": round(float(-np.log(max(p[oc], 1e-9))), 3),  # 该场 log-loss
            "source": r["source"],
        })

    # ---- 真实赛程数据层（覆盖门户合成赛程）：72 场真实对阵 + 冻结 λ + 已完赛比分 ----
    played = {(r["date"], r["home"], r["away"]): r for _, r in results.iterrows()
              if (r["date"], r["home"], r["away"]) in preds}
    from collections import defaultdict
    gdates = defaultdict(set)
    for f in frozen["fixtures"]:
        gdates[f["group"]].add(f["date"])
    gmd = {g: {d: i + 1 for i, d in enumerate(sorted(ds))} for g, ds in gdates.items()}
    pair_ctr = defaultdict(int)  # (group, matchday) -> 1..2，保证 id 全局唯一
    real_fixtures = []
    for f in frozen["fixtures"]:
        md = gmd[f["group"]][f["date"]]
        pair_ctr[(f["group"], md)] += 1
        rf = {
            "id": f"{f['group']}{md}{pair_ctr[(f['group'], md)]}", "group": f["group"],
            "matchday": md, "date": f["date"], "time": "",
            "home": {"zh": f["home_zh"], "en": f["home"]},
            "away": {"zh": f["away_zh"], "en": f["away"]},
            "lh": f["lambda_home"], "la": f["lambda_away"],
        }
        key = (f["date"], f["home"], f["away"])
        if key in played:
            r = played[key]
            hg, ag = int(r["home_goals"]), int(r["away_goals"])
            oc = ["home", "draw", "away"][outcome_idx(hg, ag)]
            rf["result"] = {"hg": hg, "ag": ag, "outcome": oc, "pick": f["pick"],
                            "pick_correct": bool(f["pick"] == oc)}
        real_fixtures.append(rf)

    n = len(rows)
    summary = {"n": n, "indicative": n < SMALL_N}
    if n:
        Pa, Ya = np.array(P), np.array(Y)
        uni = np.full_like(Pa, 1 / 3)
        summary.update({
            "pick_accuracy": round(pick_correct / n, 4),
            "log_loss": round(log_loss(Ya, Pa), 4),
            "brier": round(brier_score(Ya, Pa), 4),
            "log_loss_uniform": round(log_loss(Ya, uni), 4),     # 无技能floor=ln3≈1.0986
            "brier_uniform": round(brier_score(Ya, uni), 4),
            "skill_vs_uniform_ll": round(log_loss(Ya, uni) - log_loss(Ya, Pa), 4),  # >0 = 有技能
            "exact_score_hits": exact_hits, "exact_score_rate": round(exact_hits / n, 4),
            "top3_hits": sum(r_["in_top3"] for r_ in rows),
            "top3_rate": round(sum(r_["in_top3"] for r_ in rows) / n, 4),
            "exact_ceiling": 0.12,  # 国际赛留出实测：最优调参精确比分命中率上限≈12%（见 measure_scoreline.py）
            "ou25_accuracy": round(ou_correct / n, 4),
            "btts_accuracy": round(btts_correct / n, 4),
            "total_goals_mae": round(tot_goal_abs / n, 3),
            "mean_prob_on_actual": round(float(np.mean([r_["prob_actual"] for r_ in rows])), 4),
        })

    out = {
        "meta": {
            "as_of": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "model_version": fmeta.get("model_version"),
            "model_fit_time": fmeta.get("model_fit_time"),
            "data_cutoff": fmeta.get("data_cutoff"),
            "neutral_policy": fmeta.get("neutral_policy"),
            "small_n_threshold": SMALL_N,
            "scope": "group stage",
            "result_sources": sorted({r_["source"] for r_ in rows}) if rows else [],
            "unmatched_results": [list(k) for k in unmatched],
        },
        "summary": summary,
        "matches": sorted(rows, key=lambda x: (x["date"], x["home"])),
    }
    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    js = ("/* RedFootball — 战报/准确率数据层（自动生成，勿手改）\n"
          f" * 生成：{out['meta']['as_of']} · 模型 v{out['meta']['model_version']} · 已打分 {n} 场\n"
          " * 刷新：PYTHONPATH=src python scripts/score_predictions.py\n"
          " * WC_ACCURACY=战报指标；WC_REAL_FIXTURES=真实小组赛程(覆盖合成赛程,含已完赛比分) */\n"
          f"window.WC_ACCURACY = {json.dumps(out, ensure_ascii=False, separators=(',', ':'))};\n"
          f"window.WC_REAL_FIXTURES = {json.dumps(real_fixtures, ensure_ascii=False, separators=(',', ':'))};\n")
    OUT_JS.parent.mkdir(parents=True, exist_ok=True)
    OUT_JS.write_text(js, encoding="utf-8")

    # ---- 终端 markdown 摘要 ----
    print(f"\n{'='*64}\n  WC2026 战报 · 已打分 {n} 场"
          + (f"（{'指示性·样本不足' if summary['indicative'] else '样本充足'}）" if n else "") + f"\n{'='*64}")
    if n:
        print(f"  Top-pick 命中: {pick_correct}/{n} = {summary['pick_accuracy']:.0%}")
        print(f"  log-loss: {summary['log_loss']:.3f}  (无技能floor {summary['log_loss_uniform']:.3f}; "
              f"技能差 {summary['skill_vs_uniform_ll']:+.3f})")
        print(f"  Brier: {summary['brier']:.3f}   精确比分命中: {exact_hits}/{n}")
        print(f"  大小球2.5: {summary['ou25_accuracy']:.0%}  BTTS: {summary['btts_accuracy']:.0%}  "
              f"总进球MAE: {summary['total_goals_mae']:.2f}")
        print(f"\n  逐场:")
        for r_ in out["matches"]:
            mark = "✓" if r_["pick_correct"] else "✗"
            print(f"   {mark} {r_['date']} {r_['home']} {r_['home_goals']}-{r_['away_goals']} {r_['away']}"
                  f"  | 预测 H{r_['p_home']:.0%}/D{r_['p_draw']:.0%}/A{r_['p_away']:.0%}"
                  f" pick={r_['pick']} → 实际{r_['outcome']} (P={r_['prob_actual']:.0%})")
    print(f"\n✓ {OUT_JSON}\n✓ {OUT_JS}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
