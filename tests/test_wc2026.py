"""官方 2026 赛制：分组完整性、495 落位表、官方淘汰赛树自洽。"""
import numpy as np
import pytest

from wcpredict.model.dixon_coles import DixonColesParams
from wcpredict.tournament.wc2026 import (
    GROUPS_2026,
    OfficialWC2026Simulator,
    R32_MATCHES,
    THIRD_SLOT_SETS,
    build_assignment_table,
)


def test_groups_integrity():
    assert len(GROUPS_2026) == 12
    assert all(len(v) == 4 for v in GROUPS_2026.values())
    teams = [t for v in GROUPS_2026.values() for t in v]
    assert len(teams) == 48
    assert len(set(teams)) == 48                         # 无重复
    # 东道主在 A/B/D 档位 1
    assert GROUPS_2026["A"][0] == "Mexico"
    assert GROUPS_2026["B"][0] == "Canada"
    assert GROUPS_2026["D"][0] == "United States"


def test_third_slot_sets_exclude_own_winner_group():
    """每个第三名槽位的组集合必须排除该场头名所在组（否则会洲内/同组重赛）。"""
    for mno, (s1, s2) in R32_MATCHES.items():
        if s2[0] == "3":
            assert s1[0] == "W"
            assert s1[1] not in s2[1], f"M{mno}: 第三名集合包含了头名组 {s1[1]}"


def test_assignment_table_covers_all_495():
    """全部 C(12,8)=495 种合格第三名组合都有合法落位（不抛即通过 Hall 检验）。"""
    table, n_multi = build_assignment_table()
    from math import comb
    assert len(table) == comb(12, 8) == 495
    # 每个落位是 slot->组 的双射，且组落在其集合内
    for q, assign in table.items():
        assert len(assign) == 8
        assert set(assign.values()) == set(q)            # 恰好覆盖 8 个合格组
        for slot, g in assign.items():
            assert g in THIRD_SLOT_SETS[slot]
    print(f"\n  495 组合中有 {n_multi} 个存在多解（非唯一）")


def _official_params(seed=0):
    """对 48 支官方球队造一组合成 DC 参数（离线，不触网）。"""
    rng = np.random.default_rng(seed)
    teams = [t for v in GROUPS_2026.values() for t in v]
    ratings = {t: 1500 + rng.normal(0, 150) for t in teams}
    return DixonColesParams.from_ratings(ratings, goals_scale=0.0012)


@pytest.fixture(scope="module")
def result():
    return OfficialWC2026Simulator(_official_params()).run(n_sims=4000, seed=1)


def test_official_stage_identities(result):
    p = result.probs
    assert p["win_group"].sum() == pytest.approx(12)
    assert p["runner_up"].sum() == pytest.approx(12)
    assert p["advance"].sum() == pytest.approx(32)
    assert p["reach_R16"].sum() == pytest.approx(16)
    assert p["reach_QF"].sum() == pytest.approx(8)
    assert p["reach_SF"].sum() == pytest.approx(4)
    assert p["reach_Final"].sum() == pytest.approx(2)
    assert p["champion"].sum() == pytest.approx(1)


def test_official_monotonic(result):
    p = result.probs
    assert (p["champion"] <= p["reach_Final"] + 1e-9).all()
    assert (p["reach_Final"] <= p["reach_SF"] + 1e-9).all()
    assert (p["reach_SF"] <= p["reach_QF"] + 1e-9).all()
    assert (p["reach_QF"] <= p["reach_R16"] + 1e-9).all()
    assert (p["reach_R16"] <= p["advance"] + 1e-9).all()
    assert len(p) == 48


def test_official_reproducible():
    params = _official_params(seed=3)
    r1 = OfficialWC2026Simulator(params).run(n_sims=1500, seed=7)
    r2 = OfficialWC2026Simulator(params).run(n_sims=1500, seed=7)
    assert np.allclose(r1.probs["champion"].to_numpy(), r2.probs["champion"].to_numpy())


def test_third_routing_choice_is_immaterial_for_champion():
    """第三名落位非唯一，但"选哪套合法落位"对夺冠概率的影响应可忽略（同种子隔离路由效应）。"""
    tableA, _ = build_assignment_table(reverse=False)
    tableB, _ = build_assignment_table(reverse=True)
    assert any(tableA[q] != tableB[q] for q in tableA)   # 两套确实不同
    params = _official_params(seed=5)
    a = OfficialWC2026Simulator(params, assignment_table=tableA).run(n_sims=8000, seed=2026).probs
    b = OfficialWC2026Simulator(params, assignment_table=tableB).run(n_sims=8000, seed=2026).probs
    champ_diff = (a["champion"] - b.loc[a.index, "champion"]).abs().max()
    assert champ_diff < 0.012, f"落位选择对夺冠概率影响过大: {champ_diff*100:.2f}pp"
