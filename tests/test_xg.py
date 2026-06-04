"""射门级 xG：几何手算核验 + 逻辑回归参数复原 + 点球常数 + 校准。

真值是进球。几何是经典陷阱，逐样本手算核对（advisor 强调）。
"""
import numpy as np
import pandas as pd
import pytest

from wcpredict.data.statsbomb import StatsBombSource
from wcpredict.metrics.calibration import expected_calibration_error
from wcpredict.xg.features import (
    FEATURE_NAMES,
    prepare_shots,
    shot_angle,
    shot_distance,
)
from wcpredict.xg.model import PENALTY_XG, ShotXGModel, assign_xg, fit_xg_model


# ---------------------------------------------------------------- 几何手算核验
def test_distance_handcomputed():
    # 正对球门 6 码：(114,40) → 距离 6
    assert shot_distance(114.0, 40.0) == pytest.approx(6.0)
    # 12 码点球点正中：(108,40) → 距离 12
    assert shot_distance(108.0, 40.0) == pytest.approx(12.0)
    # 底线偏出 (120,50)：到中心 (120,40) 距离 10
    assert shot_distance(120.0, 50.0) == pytest.approx(10.0)


def test_angle_handcomputed_central_close_is_wide():
    """正对球门 6 码 (114,40)：a=(6,-4),b=(6,4),cos=20/52 → arccos≈1.176 rad（宽张角）。"""
    ang = float(shot_angle(114.0, 40.0))
    assert ang == pytest.approx(np.arccos(20.0 / 52.0), abs=1e-9)
    assert ang == pytest.approx(1.1760, abs=1e-3)
    assert np.degrees(ang) == pytest.approx(67.38, abs=0.05)


def test_angle_handcomputed_byline_is_near_zero():
    """贴底线偏出 (120,50)：两向量平行 → 张角≈0（几乎不可能进）。"""
    ang = float(shot_angle(120.0, 50.0))
    assert ang == pytest.approx(0.0, abs=1e-9)


def test_angle_penalty_spot_central():
    """点球点正中 (108,40)：cos=128/160=0.8 → arccos(0.8)≈0.6435 rad。"""
    ang = float(shot_angle(108.0, 40.0))
    assert ang == pytest.approx(np.arccos(0.8), abs=1e-9)
    assert np.degrees(ang) == pytest.approx(36.87, abs=0.05)


def test_angle_monotone_central_close_beats_wide_far():
    """正对近射张角 > 大角度远射张角（几何单调性 sanity）。"""
    close_central = float(shot_angle(114.0, 40.0))     # 6 码正中
    far_wide = float(shot_angle(90.0, 60.0))           # 30 码且偏侧
    assert close_central > far_wide


# ------------------------------------------------------------ prepare_shots 列
def _toy_shots():
    return pd.DataFrame(
        {
            "x": [114.0, 108.0, 100.0, 95.0],
            "y": [40.0, 40.0, 30.0, 50.0],
            "body_part": ["Right Foot", "Right Foot", "Head", "Left Foot"],
            "shot_type": ["Open Play", "Penalty", "Open Play", "Free Kick"],
            "goal": [True, True, False, False],
        }
    )


def test_prepare_shots_columns():
    p = prepare_shots(_toy_shots())
    for col in [*FEATURE_NAMES, "is_penalty", "goal_int"]:
        assert col in p.columns
    # 第 2 行是点球
    assert p["is_penalty"].tolist() == [0.0, 1.0, 0.0, 0.0]
    # 第 3 行是头球；第 1/3 行是 open play
    assert p["is_header"].tolist() == [0.0, 0.0, 1.0, 0.0]
    assert p["is_open_play"].tolist() == [1.0, 0.0, 1.0, 0.0]
    assert p["goal_int"].tolist() == [1, 1, 0, 0]


# ------------------------------------------------------ 合成数据：逻辑回归复原
def _synth(n, seed=0):
    """从已知原始系数生成射门特征 + 伯努利进球标签。"""
    rng = np.random.default_rng(seed)
    distance = rng.uniform(2.0, 40.0, n)
    angle = rng.uniform(0.1, 1.5, n)
    is_header = (rng.random(n) < 0.15).astype(float)
    is_open_play = (rng.random(n) < 0.80).astype(float)
    X = np.column_stack([distance, angle, is_header, is_open_play])
    true = {"intercept": -0.5, "distance": -0.12, "angle": 1.2, "is_header": -0.4, "is_open_play": 0.3}
    logit = (
        true["intercept"]
        + true["distance"] * distance
        + true["angle"] * angle
        + true["is_header"] * is_header
        + true["is_open_play"] * is_open_play
    )
    p = 1.0 / (1.0 + np.exp(-logit))
    y = (rng.random(n) < p).astype(float)
    return X, y, true


def test_logistic_recovers_known_coefficients():
    X, y, true = _synth(60000, seed=1)
    m = ShotXGModel(l2=1e-6).fit(X, y)
    got = m.coef_original_
    # 符号 + 量级复原（伯努利噪声，给 0.03 容差）
    assert got["distance"] == pytest.approx(true["distance"], abs=0.03)
    assert got["angle"] == pytest.approx(true["angle"], abs=0.10)
    assert got["is_header"] == pytest.approx(true["is_header"], abs=0.12)
    assert got["is_open_play"] == pytest.approx(true["is_open_play"], abs=0.12)
    assert got["intercept"] == pytest.approx(true["intercept"], abs=0.15)
    # 关键符号：距离越远进球概率越低，张角越大越高
    assert got["distance"] < 0 < got["angle"]


def test_predicted_xg_is_calibrated_on_heldout():
    """生成过程即逻辑模型 → 留出集上 ECE 应很小（针对真值进球校准）。"""
    Xtr, ytr, _ = _synth(40000, seed=2)
    Xte, yte, _ = _synth(20000, seed=3)
    m = ShotXGModel(l2=1e-6).fit(Xtr, ytr)
    p = m.predict_proba(Xte)
    assert expected_calibration_error(yte, p, n_bins=10) < 0.02
    # 总量校准：Σ预测 ≈ Σ进球
    assert p.sum() == pytest.approx(yte.sum(), rel=0.05)


# ---------------------------------------------------------------- 点球常数处理
def test_penalty_constant_and_excluded_from_fit():
    shots = _toy_shots()
    p = prepare_shots(shots)
    model = fit_xg_model(p, l2=1e-3)  # 只用 3 个非点球样本拟合（不应触碰点球行）
    xg = assign_xg(p, model)
    # 点球那一行（idx 1）必须恰为常数 0.76
    assert xg[1] == pytest.approx(PENALTY_XG)
    # 非点球行落在 (0,1) 概率区间
    nonpen = xg[[0, 2, 3]]
    assert ((nonpen > 0.0) & (nonpen < 1.0)).all()


def test_parse_shots_captures_period_and_shootout_excludable():
    """parse_shots 抓 period；点球大战(period 5)应可被剔除（不混进比赛内 xG）。"""
    events = [
        {"type": {"name": "Shot"}, "period": 2, "location": [100.0, 40.0],
         "shot": {"outcome": {"name": "Goal"}, "type": {"name": "Open Play"},
                  "body_part": {"name": "Right Foot"}, "statsbomb_xg": 0.3}},
        {"type": {"name": "Shot"}, "period": 5, "location": [108.0, 40.0],
         "shot": {"outcome": {"name": "Goal"}, "type": {"name": "Penalty"},
                  "body_part": {"name": "Right Foot"}, "statsbomb_xg": 0.78}},
        {"type": {"name": "Pass"}},  # 非射门，应忽略
    ]
    rows = StatsBombSource.parse_shots(events, match_id=1)
    assert len(rows) == 2
    assert [r["period"] for r in rows] == [2, 5]
    df = pd.DataFrame(rows)
    kept = df[df["period"] != 5]                 # 复刻 shots() 默认剔除点球大战
    assert len(kept) == 1
    assert kept.iloc[0]["period"] == 2


def test_assign_xg_all_penalties():
    """全是点球时也不应崩（不调用未拟合模型的预测分支）。"""
    pens = pd.DataFrame(
        {
            "x": [108.0, 108.0],
            "y": [40.0, 40.0],
            "body_part": ["Right Foot", "Left Foot"],
            "shot_type": ["Penalty", "Penalty"],
            "goal": [True, False],
        }
    )
    p = prepare_shots(pens)
    xg = assign_xg(p, ShotXGModel())  # 未拟合也可，因为全点球不会走预测分支
    assert np.allclose(xg, PENALTY_XG)
