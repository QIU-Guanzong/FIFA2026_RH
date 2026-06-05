"""Polymarket 公开读接口（免鉴权）：WC2026 夺冠盘 → 去水位市场隐含概率，与模型对比。

诚实口径（advisor 反复强调）：**独立 ≠ edge**。夺冠盘是 $15 亿成交的有效前沿，我们赢不过它；
本层的价值是**量化"模型 vs 市场"分歧、找局部错价、做校准记分牌**，不是据此在夺冠盘下注。

机制：该事件是 **neg-risk** 多结果集（60 个"某队夺冠？"二元市场），各队 Yes 价之和≈1+水位，
按归一化去水位（multiplicative）。**未校正**项：时间价值衰减（资金锁到 2026 年中→价格系统性偏低）、
favorite-longshot 偏差——仅作一阶对比，结论需带此保留（解析与网络分离，便于离线单测）。
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request

import pandas as pd

from wcpredict.odds.devig import devig as _devig

_GAMMA = "https://gamma-api.polymarket.com"
_UA = "Mozilla/5.0 (wcpredict market ingestion)"
WC_WINNER_SLUG = "world-cup-winner"

# Polymarket 队名 → 我们的 canonical 队名（仅列不一致者；其余 43 队直接同名命中）
_TEAM_ALIASES = {
    "Bosnia-Herzegovina": "Bosnia and Herzegovina",
    "Czechia": "Czech Republic",
    "Congo DR": "DR Congo",
    "Turkiye": "Turkey",
    "USA": "United States",
}


def normalize_team(name: str) -> str:
    """Polymarket 队名 → canonical。"""
    return _TEAM_ALIASES.get((name or "").strip(), (name or "").strip())


def _get_json(url: str, *, timeout: int = 25, retries: int = 4):
    """带有界重试 + 指数退避的 JSON GET（市场数据时效性强，不落盘缓存）。"""
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    last: Exception | None = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
                return json.loads(resp.read())
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            last = e
            if attempt < retries - 1:
                time.sleep(1.5 * (2 ** attempt))
    raise last  # type: ignore[misc]


class PolymarketSource:
    """免鉴权读取 Polymarket Gamma API 的 WC2026 夺冠盘。"""

    def __init__(self, slug: str = WC_WINNER_SLUG):
        self.slug = slug

    def fetch_event(self) -> dict:
        data = _get_json(f"{_GAMMA}/events?slug={self.slug}")
        if isinstance(data, list):
            if not data:
                raise RuntimeError(f"Polymarket 未找到事件 slug={self.slug}")
            return data[0]
        return data

    @staticmethod
    def _yes_price(m: dict) -> float | None:
        """单个二元市场的 Yes 价：优先 bid/ask 中值，回退 lastTradePrice，再回退 outcomePrices[0]。"""
        bid, ask = m.get("bestBid"), m.get("bestAsk")
        try:
            if bid is not None and ask is not None and float(bid) > 0 and float(ask) > 0:
                return (float(bid) + float(ask)) / 2.0
        except (TypeError, ValueError):
            pass
        last = m.get("lastTradePrice")
        try:
            if last is not None and float(last) > 0:
                return float(last)
        except (TypeError, ValueError):
            pass
        op = m.get("outcomePrices")
        if isinstance(op, str):
            try:
                op = json.loads(op)
            except json.JSONDecodeError:
                op = None
        if op:
            try:
                return float(op[0])
            except (TypeError, ValueError, IndexError):
                return None
        return None

    @classmethod
    def parse_winner_market(cls, event: dict) -> pd.DataFrame:
        """事件 JSON → 每队一行：team(canonical) / yes_price / bid / ask / last。

        丢弃无价格的占位市场（如 Team AM）；队名做 canonical 归一。
        """
        rows = []
        for m in (event.get("markets") or []):
            title = m.get("groupItemTitle") or m.get("question")
            if not title:
                continue
            yes = cls._yes_price(m)
            if yes is None:
                continue
            rows.append({
                "team": normalize_team(str(title)),
                "yes_price": float(yes),
                "bestBid": m.get("bestBid"),
                "bestAsk": m.get("bestAsk"),
                "lastTradePrice": m.get("lastTradePrice"),
            })
        df = pd.DataFrame(rows)
        if not df.empty:
            df = df.drop_duplicates(subset="team", keep="first").reset_index(drop=True)
        return df


def devig_multiway(yes_prices: pd.Series) -> pd.Series:
    """多结果归一化去水位：p_i = yes_i / Σ yes（neg-risk 全集求和，去掉总水位）。"""
    s = yes_prices.astype(float)
    total = s.sum()
    if total <= 0:
        raise ValueError("Yes 价之和非正，无法去水位")
    return s / total


def market_win_probs(parsed: pd.DataFrame, method: str = "multiplicative") -> pd.Series:
    """解析表 → 去水位后的市场隐含夺冠概率（index=canonical 队名）。

    默认 **multiplicative**（简单归一化）。**实测教训**：Shin 是为小盘口少结果（~5–15% 水位）
    设计的 favorite-longshot 校正；本盘是 50+ 结果、Σyes≈2.0 的预测市场，Shin 超出适用域会过度
    挤压冷门、把 Spain/France 抬到 ~23%（实际 ≈16%）→ **失真，故不用**。简单归一化保留各队相对
    Yes 价（Spain≈16%，与原始价一致），是更忠实的去水位。时间价值衰减的一阶（均匀）折扣在归一化
    中自动抵消。归一化分母用**全集**（含非我方 48 队真实价格），调用方再取交集对比。
    （Shin 仍可经 method='shin' 调用，但已验证对本盘失真。）
    """
    s = parsed.set_index("team")["yes_price"].astype(float)
    s = s[s > 0].clip(lower=1e-6, upper=1.0 - 1e-6)     # 夹到 (0,1)，保证赔率 1/yes > 1
    if method == "multiplicative":
        return devig_multiway(s)
    p = _devig((1.0 / s).to_numpy(), method)            # Yes 价 → 赔率 → Shin/additive（已验证对本盘失真）
    return pd.Series(p, index=s.index)


def compare_to_market(model_probs: pd.Series, market_probs: pd.Series) -> pd.DataFrame:
    """模型 vs 市场（仅在两边都有的队上对比）。diff = 模型 − 市场（>0 表示模型更看好）。"""
    common = [t for t in model_probs.index if t in market_probs.index]
    df = pd.DataFrame({
        "model": model_probs.loc[common].astype(float),
        "market": market_probs.loc[common].astype(float),
    })
    df["diff"] = df["model"] - df["market"]
    df["abs_diff"] = df["diff"].abs()
    return df.sort_values("abs_diff", ascending=False)
