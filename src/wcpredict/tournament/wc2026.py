"""2026 世界杯官方赛制：真实分组 + 官方 R32/淘汰赛树（取代蛇形+实力重做种近似）。

数据来源（已对 Wikipedia 抽签页核验，分组另对搜索结果交叉验证；2026-06）：
  - 官方分组 A–L（2025-12-05 抽签 + 后续附加赛胜者）
  - R32 16 场对阵骨架 + R16→决赛树（73–104 场，103 为三四名决赛）
  - 8 个第三名落位：官方 Annex C 共 495 种组合，仅在 FIFA 规程 PDF 内。
    本模块**不猜表**——而是严格执行 Wikipedia 公布的"每个第三名槽位接受哪 5 个组"的约束，
    用二部图匹配求一组满足约束的落位。若该约束下每种组合仅一个合法匹配，则等价于 Annex C；
    若多解，则我们取其一（已用"夺冠概率在不同合法匹配下是否变动"量化其影响，见测试/报告）。

队名与 martj42 国际赛数据完全对齐（48/48 精确匹配，含 Curaçao 的 ç）。
"""
from __future__ import annotations

import itertools

import numpy as np
import pandas as pd

from wcpredict.model.dixon_coles import DixonColesParams
from wcpredict.tournament.monte_carlo import TournamentResult, TournamentSimulator

# ---- 官方分组（位置 1-4 = 抽签档位顺序）----
GROUPS_2026: dict[str, list[str]] = {
    "A": ["Mexico", "South Africa", "South Korea", "Czech Republic"],
    "B": ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
    "C": ["Brazil", "Morocco", "Haiti", "Scotland"],
    "D": ["United States", "Paraguay", "Australia", "Turkey"],
    "E": ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
    "F": ["Netherlands", "Japan", "Sweden", "Tunisia"],
    "G": ["Belgium", "Egypt", "Iran", "New Zealand"],
    "H": ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
    "I": ["France", "Senegal", "Iraq", "Norway"],
    "J": ["Argentina", "Algeria", "Austria", "Jordan"],
    "K": ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
    "L": ["England", "Croatia", "Ghana", "Panama"],
}
GROUP_LETTERS = list(GROUPS_2026)

# ---- R32 16 场（按 match 编号顺序）。spec: ("W",组)=头名 ("R",组)=次名 ("3",组集合)=某最好第三 ----
R32_MATCHES: dict[int, tuple] = {
    73: (("R", "A"), ("R", "B")),
    74: (("W", "E"), ("3", frozenset("ABCDF"))),
    75: (("W", "F"), ("R", "C")),
    76: (("W", "C"), ("R", "F")),
    77: (("W", "I"), ("3", frozenset("CDFGH"))),
    78: (("R", "E"), ("R", "I")),
    79: (("W", "A"), ("3", frozenset("CEFHI"))),
    80: (("W", "L"), ("3", frozenset("EHIJK"))),
    81: (("W", "D"), ("3", frozenset("BEFIJ"))),
    82: (("W", "G"), ("3", frozenset("AEHIJ"))),
    83: (("R", "K"), ("R", "L")),
    84: (("W", "H"), ("R", "J")),
    85: (("W", "B"), ("3", frozenset("EFGIJ"))),
    86: (("W", "J"), ("R", "H")),
    87: (("W", "K"), ("3", frozenset("DEIJL"))),
    88: (("R", "D"), ("R", "G")),
}

# 8 个"第三名槽位" → 接受的组集合（顺序固定，用于落位与匹配）
SLOT_ORDER = [74, 77, 79, 80, 81, 82, 85, 87]
THIRD_SLOT_SETS: dict[int, frozenset] = {
    m: spec[1] for m, (s1, spec) in R32_MATCHES.items() if spec[0] == "3"
}

# ---- R16 → 决赛 树（match → 两个上游 match 的胜者）。103=三四名决赛，不模拟 ----
KNOCKOUT_TREE: dict[int, tuple[int, int]] = {
    89: (74, 77), 90: (73, 75), 91: (76, 78), 92: (79, 80),
    93: (83, 84), 94: (81, 82), 95: (86, 88), 96: (85, 87),
    97: (89, 90), 98: (93, 94), 99: (91, 92), 100: (95, 96),
    101: (97, 98), 102: (99, 100),
    104: (101, 102),
}
R16_MATCHES = [89, 90, 91, 92, 93, 94, 95, 96]
QF_MATCHES = [97, 98, 99, 100]
SF_MATCHES = [101, 102]


# ---- 第三名落位：在"每槽接受哪些组"约束下做二部图匹配 ----
def _find_one_matching(qual_groups: frozenset, reverse: bool = False) -> dict[int, str] | None:
    """给 SLOT_ORDER 每个槽位分配一个互异的合格组（落在其集合内）。返回 slot→组 或 None。

    reverse=True 时按相反顺序搜索 → 在多解组合上给出**另一组**合法落位，用于量化"落位选择是否影响概率"。
    """
    slots = sorted(SLOT_ORDER, key=lambda s: len(THIRD_SLOT_SETS[s] & qual_groups))  # 最受限优先
    assign: dict[int, str] = {}
    used: set[str] = set()

    def bt(i: int) -> bool:
        if i == len(slots):
            return True
        s = slots[i]
        candidates = sorted(THIRD_SLOT_SETS[s], reverse=reverse)
        for g in candidates:
            if g in qual_groups and g not in used:
                used.add(g)
                assign[s] = g
                if bt(i + 1):
                    return True
                used.discard(g)
                del assign[s]
        return False

    return dict(assign) if bt(0) else None


def _count_matchings(qual_groups: frozenset) -> int:
    slots = SLOT_ORDER
    used: set[str] = set()
    total = 0

    def bt(i: int) -> None:
        nonlocal total
        if i == len(slots):
            total += 1
            return
        for g in THIRD_SLOT_SETS[slots[i]]:
            if g in qual_groups and g not in used:
                used.add(g)
                bt(i + 1)
                used.discard(g)

    bt(0)
    return total


def build_assignment_table(reverse: bool = False) -> tuple[dict[frozenset, dict[int, str]], int]:
    """对全部 C(12,8)=495 种合格第三名组合求落位。返回 (表, 多解组合数)。

    reverse 切换搜索方向 → 得到另一套合法落位（多解时与默认不同），用于敏感性测量。
    """
    table: dict[frozenset, dict[int, str]] = {}
    multi = 0
    for combo in itertools.combinations(GROUP_LETTERS, 8):
        q = frozenset(combo)
        m = _find_one_matching(q, reverse=reverse)
        if m is None:
            raise ValueError(f"第三名落位无解（疑似槽位集合转写错误）: {sorted(q)}")
        table[q] = m
        if _count_matchings(q) > 1:
            multi += 1
    return table, multi


class OfficialWC2026Simulator(TournamentSimulator):
    """用官方 2026 分组 + 官方淘汰赛树模拟整届世界杯。"""

    def __init__(self, params: DixonColesParams, *, max_goals: int | None = None,
                 assignment_table: dict | None = None):
        super().__init__(params, GROUPS_2026, **({} if max_goals is None else {"max_goals": max_goals}))
        self._letter_to_gidx = {g: i for i, g in enumerate(self.group_names)}
        if assignment_table is None:
            self.assignment_table, self.n_multi_assignment = build_assignment_table()
        else:
            self.assignment_table, self.n_multi_assignment = assignment_table, -1

    def run(self, n_sims: int = 30000, seed: int = 2026) -> TournamentResult:
        rng = np.random.default_rng(seed)
        N = n_sims
        winners, runners, thirds, thirds_key = self._simulate_group_stage(rng, N)
        qual_cols, _ = self._select_best_thirds(thirds, thirds_key)   # qual_cols[N,8] = 组索引

        # 每届的"8 个合格组"位掩码 → 落位（按 unique mask 分组向量化）
        masks = (1 << qual_cols).sum(axis=1)
        third_for_slot = np.empty((N, len(SLOT_ORDER)), dtype=np.int64)
        for mask in np.unique(masks):
            letters = frozenset(self.group_names[b] for b in range(12) if (mask >> b) & 1)
            assign = self.assignment_table[letters]                   # slot -> 组字母
            sgi = np.array([self._letter_to_gidx[assign[s]] for s in SLOT_ORDER])
            rows = np.where(masks == mask)[0]
            third_for_slot[rows] = thirds[np.ix_(rows, sgi)]

        slot_pos = {s: i for i, s in enumerate(SLOT_ORDER)}

        def resolve(spec, mno):
            kind, arg = spec
            if kind == "W":
                return winners[:, self._letter_to_gidx[arg]]
            if kind == "R":
                return runners[:, self._letter_to_gidx[arg]]
            return third_for_slot[:, slot_pos[mno]]                   # "3"

        match_winner: dict[int, np.ndarray] = {}
        participants: list[np.ndarray] = []
        for mno, (s1, s2) in R32_MATCHES.items():
            t1, t2 = resolve(s1, mno), resolve(s2, mno)
            participants += [t1, t2]
            p = self.p_adv[t1, t2]
            match_winner[mno] = np.where(rng.random(N) < p, t1, t2)

        for mno in R16_MATCHES + QF_MATCHES + SF_MATCHES + [104]:
            f1, f2 = KNOCKOUT_TREE[mno]
            t1, t2 = match_winner[f1], match_winner[f2]
            p = self.p_adv[t1, t2]
            match_winner[mno] = np.where(rng.random(N) < p, t1, t2)

        def stack(mnos):
            return np.stack([match_winner[m] for m in mnos], axis=1)

        N_ = float(N)
        df = pd.DataFrame(
            {
                "win_group": self._counts(winners) / N_,
                "runner_up": self._counts(runners) / N_,
                "advance": self._counts(np.stack(participants, axis=1)) / N_,
                "reach_R16": self._counts(stack(list(R32_MATCHES))) / N_,
                "reach_QF": self._counts(stack(R16_MATCHES)) / N_,
                "reach_SF": self._counts(stack(QF_MATCHES)) / N_,
                "reach_Final": self._counts(stack(SF_MATCHES)) / N_,
                "champion": self._counts(match_winner[104]) / N_,
            },
            index=self.local_teams,
        ).sort_values("champion", ascending=False)
        return TournamentResult(probs=df, n_sims=N)
