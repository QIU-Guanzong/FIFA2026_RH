"""规范数据 schema：所有数据源归一化到同一套列，模型层与数据来源彻底解耦。

比赛主数据 (MATCH) 与赔率 (ODDS) 分两张表，通过 (date, home, away) 关联。
合成数据与真实采集器都产出这套 schema，因此模型/回测代码无需关心来源。
"""
from __future__ import annotations

import pandas as pd

# ---- 比赛主数据规范列 ----
MATCH_COLUMNS = [
    "date",          # datetime64：比赛日期
    "home",          # str
    "away",          # str
    "home_goals",    # int：全场主队进球
    "away_goals",    # int
    "neutral",       # bool：是否中立场
    "importance",    # float：比赛重要性权重（世界杯阶段加权的思路）
]

# ---- 赔率规范列（长表：一行 = 一场 × 一家 × 一个时点）----
ODDS_COLUMNS = [
    "date", "home", "away",
    "book",          # str：pinnacle / bet365 / avg / max ...
    "snapshot",      # str：prematch / closing
    "odds_home", "odds_draw", "odds_away",   # 十进制 1X2 赔率
]


class SchemaError(ValueError):
    """数据不符合规范时抛出。"""


def validate_matches(df: pd.DataFrame) -> pd.DataFrame:
    """校验并规整比赛主数据；返回只含规范列、类型正确、按日期升序的副本。"""
    missing = [c for c in MATCH_COLUMNS if c not in df.columns]
    if missing:
        raise SchemaError(f"比赛数据缺少规范列: {missing}")
    out = df[MATCH_COLUMNS].copy()
    out["date"] = pd.to_datetime(out["date"], errors="coerce")
    out["home_goals"] = pd.to_numeric(out["home_goals"], errors="coerce")
    out["away_goals"] = pd.to_numeric(out["away_goals"], errors="coerce")
    out = out.dropna(subset=["date", "home", "away", "home_goals", "away_goals"])
    out["home_goals"] = out["home_goals"].astype(int)
    out["away_goals"] = out["away_goals"].astype(int)
    out["neutral"] = out["neutral"].astype(bool)
    out["importance"] = pd.to_numeric(out["importance"], errors="coerce").fillna(1.0)

    if (out["home_goals"] < 0).any() or (out["away_goals"] < 0).any():
        raise SchemaError("出现负进球数")
    if (out["home"] == out["away"]).any():
        raise SchemaError("出现主客队相同的比赛")
    return out.sort_values("date").reset_index(drop=True)


def add_days_ago(df: pd.DataFrame, ref_date: pd.Timestamp | str | None = None) -> pd.DataFrame:
    """按参考日期计算 days_ago（时间衰减用）。ref_date 缺省取数据中最新日期。"""
    out = df.copy()
    out["date"] = pd.to_datetime(out["date"])
    ref = pd.to_datetime(ref_date) if ref_date is not None else out["date"].max()
    out["days_ago"] = (ref - out["date"]).dt.days.clip(lower=0)
    return out


def validate_odds(df: pd.DataFrame) -> pd.DataFrame:
    """校验赔率长表；剔除非法（≤1.0）赔率行。"""
    missing = [c for c in ODDS_COLUMNS if c not in df.columns]
    if missing:
        raise SchemaError(f"赔率数据缺少规范列: {missing}")
    out = df[ODDS_COLUMNS].copy()
    out["date"] = pd.to_datetime(out["date"], errors="coerce")
    for c in ("odds_home", "odds_draw", "odds_away"):
        out[c] = pd.to_numeric(out[c], errors="coerce")
    out = out.dropna(subset=["odds_home", "odds_draw", "odds_away", "date"])
    valid = (out[["odds_home", "odds_draw", "odds_away"]] > 1.0).all(axis=1)
    return out[valid].reset_index(drop=True)
