"""世界杯赛制结构 + Monte Carlo 自洽性。"""
import numpy as np
import pytest

from wcpredict.data.synthetic import generate_true_params
from wcpredict.tournament import (
    TournamentSimulator,
    bracket_seed_order,
    round_robin_fixtures,
    snake_draw_groups,
)


def test_round_robin_fixtures():
    f = round_robin_fixtures(4)
    assert len(f) == 6
    assert (0, 1) in f and (2, 3) in f


def test_bracket_seed_order():
    assert bracket_seed_order(2) == [0, 1]
    assert bracket_seed_order(4) == [0, 3, 1, 2]          # 1v4, 2v3
    order32 = bracket_seed_order(32)
    assert len(order32) == 32
    assert sorted(order32) == list(range(32))             # 是 0..31 的排列
    # 1 号种子与 2 号种子分处两半区（最后才可能相遇）
    assert order32[0] == 0 and order32[16] == 1


def test_snake_draw_groups():
    teams = [f"T{i:02d}" for i in range(48)]
    groups = snake_draw_groups(teams)
    assert len(groups) == 12
    assert all(len(v) == 4 for v in groups.values())
    flat = [t for v in groups.values() for t in v]
    assert sorted(flat) == sorted(teams)                  # 每队恰好一次


@pytest.fixture(scope="module")
def result():
    params = generate_true_params(n_teams=48, seed=11)
    teams_ranked = [t for t, _ in sorted(
        {t: params.attack[i] - params.defence[i] for i, t in enumerate(params.teams)}.items(),
        key=lambda kv: kv[1], reverse=True)]
    groups = snake_draw_groups(teams_ranked)
    sim = TournamentSimulator(params, groups)
    return sim.run(n_sims=4000, seed=5)


def test_stage_sum_identities(result):
    """每届恒等式 → 各阶段概率之和精确等于参赛队数（与 N 无关）。"""
    p = result.probs
    assert p["win_group"].sum() == pytest.approx(12)
    assert p["runner_up"].sum() == pytest.approx(12)
    assert p["qualify_third"].sum() == pytest.approx(8)
    assert p["advance"].sum() == pytest.approx(32)
    assert p["reach_R16"].sum() == pytest.approx(16)
    assert p["reach_QF"].sum() == pytest.approx(8)
    assert p["reach_SF"].sum() == pytest.approx(4)
    assert p["reach_Final"].sum() == pytest.approx(2)
    assert p["champion"].sum() == pytest.approx(1)


def test_stage_monotonicity(result):
    """晋级是嵌套的：champion ≤ Final ≤ SF ≤ QF ≤ R16 ≤ advance（逐队）。"""
    p = result.probs
    assert (p["champion"] <= p["reach_Final"] + 1e-9).all()
    assert (p["reach_Final"] <= p["reach_SF"] + 1e-9).all()
    assert (p["reach_SF"] <= p["reach_QF"] + 1e-9).all()
    assert (p["reach_QF"] <= p["reach_R16"] + 1e-9).all()
    assert (p["reach_R16"] <= p["advance"] + 1e-9).all()


def test_advance_equals_group_paths(result):
    """出线 = 头名 + 次名 + 最好第三（逐队恒等）。"""
    p = result.probs
    lhs = p["advance"]
    rhs = p["win_group"] + p["runner_up"] + p["qualify_third"]
    assert np.allclose(lhs.to_numpy(), rhs.to_numpy(), atol=1e-9)


def test_stronger_teams_win_more(result):
    """强队夺冠概率更高（与实力正相关）。"""
    params = generate_true_params(n_teams=48, seed=11)
    strength = {t: params.attack[i] - params.defence[i] for i, t in enumerate(params.teams)}
    df = result.probs.copy()
    df["strength"] = [strength[t] for t in df.index]
    r = np.corrcoef(df["strength"], df["champion"])[0, 1]
    assert r > 0.5, f"实力与夺冠率相关性过低: {r:.2f}"


def test_reproducibility():
    params = generate_true_params(n_teams=48, seed=11)
    groups = snake_draw_groups(list(params.teams))
    sim = TournamentSimulator(params, groups)
    r1 = sim.run(n_sims=1500, seed=99)
    r2 = sim.run(n_sims=1500, seed=99)
    assert np.allclose(r1.probs["champion"].to_numpy(), r2.probs["champion"].to_numpy())
