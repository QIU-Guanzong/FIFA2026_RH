"""洲际归属（数据驱动派生）+ 基于洲际间残差的评分偏置校正（#6b）。

依据（详见项目 CLAUDE.md #6b 决策记录）：
- 归属是**元数据**，可用全历史派生；近期优先以正确处理会籍变更（Australia OFC→AFC、Israel→UEFA）。
- 偏置 offset 的**幅度由比赛结果估计** → 部署用全历史、回测须 train-only（两者勿混，否则污染回测）。
- 无泄漏 train≤2017 / test≥2018 测量 + 增量 bootstrap 表明：只有 **OFC**（大洋洲孤立通胀，
  New Zealand 在小联盟内刷分而跨洲被击穿）这一项**稳健**改善洲际间 OOS（OFC-only Δ≈+0.0022 log loss，
  CI 不含 0）；加上其余洲的"全 offset"增量 95%CI=[−0.00002,+0.00183] **含 0**（噪声）。
  故部署**只落地 OFC**，不对 CAF/AFC 等"一刀切"抬升（避免 era-specific 粗暴偏移）。
"""
from __future__ import annotations

import re

import numpy as np
import pandas as pd

CONFEDERATIONS = ("UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC")
GRAM_COND_THRESHOLD = 1e8
KAPPA_FLOOR = 1e-8

# 洲际赛事名 → 洲（资格赛 / 洲锦 / 次区域；刻意排除友谊与客串，后者会污染归属）
_CONF_PATTERNS = [
    ("UEFA", r"UEFA|European Championship"),
    ("CAF", r"African Cup of Nations|African Nations Championship|COSAFA|CECAFA|WAFU|CEMAC"),
    ("AFC", r"AFC Asian Cup|AFF|SAFF|EAFF|WAFF|Gulf Cup|CAFA"),
    ("CONCACAF", r"CONCACAF|Gold Cup|CFU Caribbean|UNCAF|NAFC"),
    ("OFC", r"OFC|Oceania|Pacific Games"),
    ("CONMEBOL", r"Copa Am[eé]rica|CONMEBOL"),
]

# 仅这些洲的 offset 经无泄漏增量 bootstrap 证实稳健（当前=OFC），其余在噪声内不落地。
ROBUST_CONFEDERATIONS = ("OFC",)


def _votes(tournaments) -> dict[str, int]:
    v: dict[str, int] = {}
    for t in tournaments:
        for c, pat in _CONF_PATTERNS:
            if re.search(pat, str(t), re.I):
                v[c] = v.get(c, 0) + 1
                break
    return v


def derive_confederations(raw_results: pd.DataFrame, *, recent_since: str = "2014-01-01") -> dict[str, str]:
    """从原始国际赛（含 tournament/home_team/away_team/date）数据驱动派生 team→confed。

    近期优先（recent_since 之后的洲际赛事），近期无信号则回退全历史；都无→'OTHER'。
    已在 48 支 WC2026 队上核验：Mexico/USA/Canada→CONCACAF（不被 Copa América 客串带偏）、
    Australia→AFC（会籍变更）、Japan→AFC、Morocco→CAF、Ecuador→CONMEBOL。
    """
    date = pd.to_datetime(raw_results["date"], errors="coerce")
    long = pd.concat([
        pd.DataFrame({"date": date, "tournament": raw_results["tournament"], "team": raw_results["home_team"]}),
        pd.DataFrame({"date": date, "tournament": raw_results["tournament"], "team": raw_results["away_team"]}),
    ])
    cut = pd.to_datetime(recent_since)
    out: dict[str, str] = {}
    for team, sub in long.groupby("team"):
        v = _votes(sub[sub["date"] >= cut]["tournament"]) or _votes(sub["tournament"])
        out[str(team)] = max(v, key=v.get) if v else "OTHER"
    return out


def _expected(rh: float, ra: float, neutral: bool, scale: float, home_adv: float) -> float:
    adj = rh + (0.0 if neutral else home_adv)
    return 1.0 / (1.0 + 10.0 ** (-(adj - ra) / scale))


def estimate_confederation_offsets(
    matches: pd.DataFrame, ratings: dict[str, float], conf: dict[str, str],
    *, scale: float = 400.0, home_adv: float = 65.0, ridge: float = 1e-3,
) -> dict[str, float]:
    """对**洲际间**比赛的 Elo 期望分残差做 OLS → 每洲评分点 offset（sum-to-zero）。

    负 offset = 该洲被高估（洲际间实绩低于评分预期）应下调。返回全部洲（含噪声项）；
    落地请用 deployment_offsets 只取稳健洲。matches 为规范列；洲内比赛与未知洲自动跳过。
    """
    confs = list(CONFEDERATIONS)
    idx = {c: i for i, c in enumerate(confs)}
    rows, res, ps = [], [], []
    for _, r in matches.iterrows():
        ch, ca = conf.get(r["home"], "OTHER"), conf.get(r["away"], "OTHER")
        if ch == ca or ch not in idx or ca not in idx:
            continue
        e = _expected(ratings.get(r["home"], 1500.0), ratings.get(r["away"], 1500.0),
                      bool(r["neutral"]), scale, home_adv)
        w = 1.0 if r["home_goals"] > r["away_goals"] else (0.5 if r["home_goals"] == r["away_goals"] else 0.0)
        row = np.zeros(len(confs))
        row[idx[ch]] += 1.0
        row[idx[ca]] -= 1.0
        rows.append(row)
        res.append(w - e)
        ps.append(e)
    if not rows:
        return {c: 0.0 for c in confs}
    X, y, ps = np.array(rows), np.array(res), np.array(ps)
    gram = X.T @ X + ridge * np.eye(len(confs))
    rhs = X.T @ y
    cond = np.linalg.cond(gram)
    use_lstsq = not np.isfinite(cond) or cond >= GRAM_COND_THRESHOLD
    if use_lstsq:
        beta = np.linalg.lstsq(gram, rhs, rcond=None)[0]
    else:
        try:
            beta = np.linalg.solve(gram, rhs)
        except np.linalg.LinAlgError:
            beta = np.linalg.lstsq(gram, rhs, rcond=None)[0]
    gamma = beta - beta.mean()                                   # sum-to-zero（仅相对可辨识）
    kappa = max(
        np.log(10) / scale * float(np.mean(ps * (1.0 - ps))),
        KAPPA_FLOOR,
    )                                                            # 分数残差 → 评分点
    return {confs[i]: float(gamma[i] / kappa) for i in range(len(confs))}


def deployment_offsets(matches: pd.DataFrame, ratings: dict[str, float], conf: dict[str, str], **kw) -> dict[str, float]:
    """部署用：只保留经无泄漏验证稳健的洲（ROBUST_CONFEDERATIONS=OFC），其余置 0。"""
    full = estimate_confederation_offsets(matches, ratings, conf, **kw)
    return {c: (full[c] if c in ROBUST_CONFEDERATIONS else 0.0) for c in full}


def apply_offsets(ratings: dict[str, float], conf: dict[str, str], offsets: dict[str, float]) -> dict[str, float]:
    """把洲际 offset 加到各队评分，返回新 dict（未知洲偏移 0）。"""
    return {t: ratings[t] + offsets.get(conf.get(t, "OTHER"), 0.0) for t in ratings}
