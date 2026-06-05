"""Polymarket 市场对比层：队名归一、Yes 价提取优先级、neg-risk 去水位、模型vs市场对比。

全部离线（合成事件 JSON），不触网。诚实口径在模块 docstring：独立≠edge。
"""
import pandas as pd
import pytest

from wcpredict.markets.polymarket import (
    PolymarketSource,
    compare_to_market,
    devig_multiway,
    market_win_probs,
    normalize_team,
)


def test_team_aliases():
    assert normalize_team("USA") == "United States"
    assert normalize_team("Czechia") == "Czech Republic"
    assert normalize_team("Turkiye") == "Turkey"
    assert normalize_team("Congo DR") == "DR Congo"
    assert normalize_team("Bosnia-Herzegovina") == "Bosnia and Herzegovina"
    assert normalize_team("Spain") == "Spain"          # 直接命中者不变
    assert normalize_team("  France ") == "France"     # 去空白


def _fixture_event():
    return {
        "markets": [
            {"groupItemTitle": "Spain", "bestBid": 0.159, "bestAsk": 0.16,
             "lastTradePrice": 0.16, "outcomePrices": ["0.1595", "0.8405"]},
            {"groupItemTitle": "USA", "bestBid": None, "bestAsk": None,
             "lastTradePrice": 0.02, "outcomePrices": None},          # 回退 last + 别名
            {"groupItemTitle": "England", "outcomePrices": ["0.11", "0.89"]},  # 回退 outcomePrices
            {"groupItemTitle": "Team AM", "bestBid": None, "bestAsk": None,
             "lastTradePrice": 0, "outcomePrices": None},             # 无价 → 丢弃
        ]
    }


def test_parse_winner_market_and_price_priority():
    df = PolymarketSource.parse_winner_market(_fixture_event())
    assert set(df["team"]) == {"Spain", "United States", "England"}    # Team AM 被丢弃；USA→United States
    spain = df.set_index("team").loc["Spain", "yes_price"]
    assert spain == pytest.approx((0.159 + 0.16) / 2)                  # bid/ask 中值优先
    assert df.set_index("team").loc["United States", "yes_price"] == pytest.approx(0.02)  # last 回退
    assert df.set_index("team").loc["England", "yes_price"] == pytest.approx(0.11)        # outcomePrices 回退


def test_devig_sums_to_one():
    s = pd.Series({"A": 0.16, "B": 0.10, "C": 0.80})   # 和=1.06（含水位）
    d = devig_multiway(s)
    assert d.sum() == pytest.approx(1.0)
    assert d["A"] == pytest.approx(0.16 / 1.06)


def test_market_win_probs_normalizes_over_full_set():
    df = PolymarketSource.parse_winner_market(_fixture_event())
    p = market_win_probs(df)
    assert p.sum() == pytest.approx(1.0)               # 全集归一
    assert p.index.tolist() == df["team"].tolist()


def test_compare_to_market_diff_and_sort():
    model = pd.Series({"Spain": 0.50, "United States": 0.10, "Brazil": 0.40})
    market = pd.Series({"Spain": 0.30, "United States": 0.20, "Mexico": 0.50})
    cmp = compare_to_market(model, market)
    assert list(cmp.index) == ["Spain", "United States"]   # 仅共同队；按 |diff| 降序（Spain 0.20 > US 0.10）
    assert cmp.loc["Spain", "diff"] == pytest.approx(0.20)  # 模型−市场，>0=模型更看好
    assert cmp.loc["United States", "diff"] == pytest.approx(-0.10)
    assert "Brazil" not in cmp.index and "Mexico" not in cmp.index
