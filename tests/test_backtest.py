"""Walk-forward 回测：无泄漏纪律（核心）+ 协议 + 市场对比管线。"""
import numpy as np
import pandas as pd
import pytest

from wcpredict.backtest import DCFitPredictor, EloPredictor, WalkForwardBacktest
from wcpredict.data.schema import ODDS_COLUMNS, validate_matches, validate_odds
from wcpredict.data.synthetic import generate_true_params, simulate_history


def _synth_matches(n_teams: int = 8, n: int = 700, seed: int = 0) -> pd.DataFrame:
    """合成比赛历史 → 加日期列 → 规范比赛主数据。"""
    params = generate_true_params(n_teams=n_teams, seed=seed)
    h = simulate_history(params, n_matches=n, seed=seed + 1)
    base = pd.Timestamp("2024-06-01")
    h["date"] = base - pd.to_timedelta(h["days_ago"], unit="D")
    return validate_matches(h)


def test_backtest_is_leak_free():
    """核心断言：每条预测的训练集最新日期都严格早于被预测比赛日期。"""
    m = _synth_matches(n_teams=8, n=700, seed=1)
    bt = WalkForwardBacktest(m)
    res = bt.run(EloPredictor(), min_train=150, refit_every=20)
    assert res.assert_leakfree()
    d = res.per_match
    assert (d["train_max_date"] < d["date"]).all()
    # 训练集最新日期甚至应早于"上一场同日"——即排除了同日比赛
    assert len(d) > 0


def test_predictions_are_valid_distributions():
    m = _synth_matches(n_teams=8, n=600, seed=2)
    res = WalkForwardBacktest(m).run(EloPredictor(), min_train=150, refit_every=25)
    P = res.per_match[["pm_home", "pm_draw", "pm_away"]].to_numpy()
    assert np.allclose(P.sum(axis=1), 1.0, atol=1e-9)
    assert (P > 0).all()


def test_min_train_respected():
    """少于 min_train 场严格早于的比赛时不出预测。"""
    m = _synth_matches(n_teams=8, n=500, seed=3)
    res = WalkForwardBacktest(m).run(EloPredictor(), min_train=250, refit_every=30)
    # 每条预测对应的 (严格早于的比赛数) 必 ≥ 250
    dates = m["date"].to_numpy()
    for dt in res.per_match["date"].to_numpy():
        k = int(np.searchsorted(dates, dt, side="left"))
        assert k >= 250


def test_reproducible():
    m = _synth_matches(n_teams=8, n=600, seed=4)
    r1 = WalkForwardBacktest(m).run(EloPredictor(), min_train=150, refit_every=25)
    r2 = WalkForwardBacktest(m).run(EloPredictor(), min_train=150, refit_every=25)
    assert np.allclose(
        r1.per_match["pm_home"].to_numpy(), r2.per_match["pm_home"].to_numpy()
    )


def test_dc_predictor_runs_and_leakfree():
    """DCFitPredictor 走一遍（小规模、少刷新以保证快）。"""
    m = _synth_matches(n_teams=6, n=400, seed=5)
    res = WalkForwardBacktest(m).run(DCFitPredictor(maxiter=40), min_train=200, refit_every=200)
    assert res.assert_leakfree()
    met = res.metrics()
    assert met["model_all"]["log_loss"] > 0
    assert met["leak_free"] is True


def test_unknown_team_fallback():
    """持出集中出现训练集没见过的队 → 兜底平均队，不崩。"""
    m = _synth_matches(n_teams=8, n=400, seed=6)
    pred = EloPredictor()
    pred.fit(m.iloc[:300])
    p = pred.predict_1x2("完全没出现过的队", m.iloc[0]["away"], neutral=True)
    assert p.sum() == pytest.approx(1.0)


def test_market_comparison_pipeline():
    """市场基准管线：构造匹配赔率 → 回测产出 market / model_on_market_set 指标。"""
    m = _synth_matches(n_teams=8, n=500, seed=7)
    # 给最后 120 场造 Pinnacle 赛前赔率
    tail = m.iloc[-120:]
    odds = pd.DataFrame({
        "date": tail["date"], "home": tail["home"], "away": tail["away"],
        "book": "pinnacle", "snapshot": "prematch",
        "odds_home": 2.10, "odds_draw": 3.40, "odds_away": 3.60,
    })
    odds = validate_odds(odds[ODDS_COLUMNS])
    res = WalkForwardBacktest(m, odds).run(EloPredictor(), min_train=200, refit_every=30)
    met = res.metrics()
    assert met["n_with_market"] > 0
    assert "market" in met and "model_on_market_set" in met
    assert "mean_abs_divergence" in met
