"""2026 世界杯结构工具：小组循环赛程、蛇形分组、淘汰赛做种。

R32 第三名落位由官方 Annex C（495 种组合）决定。本 MVP 采用"按总实力重新做种"
近似（standard seeding bracket）：晋级 32 队按强弱排序后填入标准单淘汰种子位
（1 对 32、保证强队晚相遇）。这是诚实的近似——它对 R16/QF 的"打进率"基本无偏，
但会影响依赖具体对阵路径的量（夺冠率、半区难度）。接入真实 2026 分组后应替换为
官方 Annex C 落位表。详见 README。
"""
from __future__ import annotations


def round_robin_fixtures(n: int = 4) -> list[tuple[int, int]]:
    """组内单循环的所有对阵（队内局部索引）。n=4 → 6 场。"""
    return [(i, j) for i in range(n) for j in range(i + 1, n)]


def bracket_seed_order(n_slots: int) -> list[int]:
    """标准单淘汰种子位顺序（0 索引）。

    返回长度 n_slots 的列表：相邻两个为同一场 R32 对阵，整体保证 1 号种子与
    2 号种子分处两个半区、强队尽量晚相遇。
    例：n=4 → [0,3,1,2]（即 1v4、2v3）。
    """
    assert n_slots >= 2 and (n_slots & (n_slots - 1)) == 0, "槽位数必须是 2 的幂"
    order = [0, 1]
    while len(order) < n_slots:
        m = len(order) * 2 - 1
        nxt: list[int] = []
        for x in order:
            nxt.append(x)
            nxt.append(m - x)
        order = nxt
    return order


def snake_draw_groups(
    ranked_teams: list[str], n_groups: int = 12, group_size: int = 4
) -> dict[str, list[str]]:
    """蛇形分档：按强弱把球队分到各组（同档实力分散）。

    与真实抽签的"分档+随机"不同，这里用确定性蛇形保证组间均衡、可复现，
    适合合成数据自检。接真实数据时换成官方抽签结果即可。
    """
    n = n_groups * group_size
    assert len(ranked_teams) == n, f"需要 {n} 支球队，得到 {len(ranked_teams)}"
    groups: dict[str, list[str]] = {chr(ord("A") + g): [] for g in range(n_groups)}
    names = list(groups.keys())
    idx = 0
    for pot in range(group_size):              # 4 个档
        order = range(n_groups) if pot % 2 == 0 else reversed(range(n_groups))
        for g in order:
            groups[names[g]].append(ranked_teams[idx])
            idx += 1
    return groups


# 组内排名 / 第三名比较用的复合排序键（整数，float64 可精确表示）。
# 优先级：积分 > 净胜球 > 进球 > 实力位次（行为分/FIFA 排名的代理）。
_PTS_MULT = 1_000_000_000_000      # 1e12
_GD_MULT = 10_000_000             # 1e7  (净胜球 +100 偏移，范围远小于 1e12/1e7)
_GF_MULT = 1_000                  # 1e3
_GD_OFFSET = 100                  # 保证 (gd+offset) 为正


def standings_key(points, goal_diff, goals_for, seed_value):
    """复合排序键（越大越靠前）。各分量已做量级隔离，避免越权进位。

    points ≤ 9、(gd+100) ≤ ~200、gf ≤ ~30、seed_value ≤ 47，
    乘子 1e12/1e7/1e3/1 互不串档，且最大值 ~9e12 < 2^53 可被 float64 精确表示。
    """
    return (
        points * _PTS_MULT
        + (goal_diff + _GD_OFFSET) * _GD_MULT
        + goals_for * _GF_MULT
        + seed_value
    )
