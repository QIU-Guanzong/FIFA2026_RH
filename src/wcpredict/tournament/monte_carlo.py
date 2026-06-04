"""世界杯全赛事 Monte Carlo 引擎（向量化）。

把单场比分矩阵接到整届赛会：小组循环 → 前二+8 最好第三 → R32 单淘汰 → 夺冠。
所有 N 次模拟向量化并行：小组赛按比分矩阵的逆 CDF 抽样（保留净胜球/进球用于排名），
淘汰赛用预计算的"晋级概率" p_adv（含 90'+加时+点球）做伯努利抽样。

为什么必须联合模拟：8 个最好第三名需要跨组比较，组内结果与跨组排名相互耦合，
不能按单组各算各的。整届 104 场，单机可控。
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from wcpredict.config import ET_SCALE, MAX_GOALS, N_GROUPS
from wcpredict.model.dixon_coles import DixonColesParams, score_matrix
from wcpredict.tournament.format import (
    _GD_MULT,
    _GD_OFFSET,
    _GF_MULT,
    _PTS_MULT,
    bracket_seed_order,
    round_robin_fixtures,
)


def _knockout_advance_prob(lam_a: float, lam_b: float, rho: float, max_goals: int) -> float:
    """A 队在一场淘汰赛对阵 B 队的晋级概率（90 分钟 → 加时 → 点球）。"""
    M = score_matrix(lam_a, lam_b, rho, max_goals)
    p_a = float(np.tril(M, -1).sum())     # A(行,x) > B(列,y)
    p_draw = float(np.trace(M))
    # 加时：期望进球按 30/90 缩放
    Met = score_matrix(lam_a * ET_SCALE, lam_b * ET_SCALE, rho, max_goals)
    p_a_et = float(np.tril(Met, -1).sum())
    p_draw_et = float(np.trace(Met))
    p_pens_a = 0.5                         # 点球默认 50/50（单独建模，可后续按实力微调）
    return p_a + p_draw * (p_a_et + p_draw_et * p_pens_a)


@dataclass
class TournamentResult:
    probs: pd.DataFrame          # index=队名，列=各阶段概率
    n_sims: int

    def top(self, n: int = 10) -> pd.DataFrame:
        return self.probs.head(n)


class TournamentSimulator:
    """给定 DC 参数与分组，向量化模拟整届世界杯。"""

    STAGES_AFTER_GROUP = ["reach_R16", "reach_QF", "reach_SF", "reach_Final", "champion"]

    def __init__(
        self,
        params: DixonColesParams,
        groups: dict[str, list[str]],
        *,
        max_goals: int = MAX_GOALS,
    ):
        self.params = params
        self.max_goals = max_goals
        self.group_names = sorted(groups)
        if len(self.group_names) != N_GROUPS:
            raise ValueError(f"需要 {N_GROUPS} 个小组，得到 {len(self.group_names)}")

        # 本地队列表（按小组顺序），并映射到 params 索引
        self.local_teams: list[str] = []
        self.group_cols: list[list[int]] = []
        for g in self.group_names:
            members = groups[g]
            if len(members) != 4:
                raise ValueError(f"小组 {g} 必须有 4 队，得到 {len(members)}")
            cols = []
            for t in members:
                cols.append(len(self.local_teams))
                self.local_teams.append(t)
            self.group_cols.append(cols)
        self.T = len(self.local_teams)

        att = np.array([params.attack[params.index[t]] for t in self.local_teams])
        de = np.array([params.defence[params.index[t]] for t in self.local_teams])
        self.strength = att - de
        # 实力位次（行为分/FIFA 排名代理；唯一整数，越大越强，<1000 不串档）
        order_strong = np.argsort(-self.strength, kind="stable")
        self.seed_value = np.empty(self.T, dtype=np.int64)
        self.seed_value[order_strong] = np.arange(self.T - 1, -1, -1)

        # 中立场 λ 矩阵：lam[i,j] = E[i 对 j 的进球]
        self.lam = np.exp(params.intercept + att[:, None] + de[None, :])

        self._precompute_knockout()
        self._precompute_group_fixtures()

    # ---- 预计算 ----
    def _precompute_knockout(self) -> None:
        T = self.T
        rho = self.params.rho
        p_adv = np.full((T, T), 0.5)
        for i in range(T):
            for j in range(T):
                if i == j:
                    continue
                p_adv[i, j] = _knockout_advance_prob(
                    self.lam[i, j], self.lam[j, i], rho, self.max_goals
                )
        self.p_adv = p_adv

    def _precompute_group_fixtures(self) -> None:
        W = self.max_goals + 1
        flat_idx = np.arange(W * W)
        self._gh_cells = flat_idx // W      # 主队(A)进球
        self._ga_cells = flat_idx % W       # 客队(B)进球
        rho = self.params.rho
        fixtures = round_robin_fixtures(4)
        self._group_fixtures: list[tuple[int, int, np.ndarray]] = []
        for cols in self.group_cols:
            for (p, q) in fixtures:
                a, b = cols[p], cols[q]
                M = score_matrix(self.lam[a, b], self.lam[b, a], rho, self.max_goals)
                cdf = np.cumsum(M.ravel())
                cdf[-1] = 1.0
                self._group_fixtures.append((a, b, cdf))

    # ---- 可复用子步骤（官方赛制模拟器复用）----
    def _simulate_group_stage(self, rng, N: int):
        """向量化小组赛 → 各组 (头名, 次名, 第三名, 第三名复合键)。返回 4 个 [N,12] 数组。"""
        T, W = self.T, self.max_goals + 1
        points = np.zeros((N, T), dtype=np.int16)
        gf = np.zeros((N, T), dtype=np.int16)
        ga = np.zeros((N, T), dtype=np.int16)
        for a, b, cdf in self._group_fixtures:
            u = rng.random(N)
            idx = np.searchsorted(cdf, u, side="right")
            np.clip(idx, 0, W * W - 1, out=idx)
            gh = self._gh_cells[idx]
            gg = self._ga_cells[idx]
            draw = gh == gg
            points[:, a] += 3 * (gh > gg) + draw
            points[:, b] += 3 * (gg > gh) + draw
            gf[:, a] += gh
            ga[:, a] += gg
            gf[:, b] += gg
            ga[:, b] += gh
        gd = gf - ga

        winners = np.empty((N, N_GROUPS), dtype=np.int64)
        runners = np.empty((N, N_GROUPS), dtype=np.int64)
        thirds = np.empty((N, N_GROUPS), dtype=np.int64)
        thirds_key = np.empty((N, N_GROUPS), dtype=np.float64)
        for g, cols in enumerate(self.group_cols):
            cols = np.array(cols)
            key = (
                points[:, cols].astype(np.float64) * _PTS_MULT
                + (gd[:, cols].astype(np.float64) + _GD_OFFSET) * _GD_MULT
                + gf[:, cols].astype(np.float64) * _GF_MULT
                + self.seed_value[cols]
            )
            order = np.argsort(-key, axis=1)
            sorted_team = cols[order]
            winners[:, g] = sorted_team[:, 0]
            runners[:, g] = sorted_team[:, 1]
            thirds[:, g] = sorted_team[:, 2]
            thirds_key[:, g] = np.take_along_axis(key, order[:, 2:3], axis=1)[:, 0]
        return winners, runners, thirds, thirds_key

    def _select_best_thirds(self, thirds, thirds_key):
        """跨组挑 8 个最好的第三名。返回 (qual_cols[N,8] 组索引, qualifying_third[N,8] 队 id)。"""
        order_thirds = np.argsort(-thirds_key, axis=1)
        qual_cols = order_thirds[:, :8]
        qualifying_third = np.take_along_axis(thirds, qual_cols, axis=1)
        return qual_cols, qualifying_third

    def _counts(self, arr: np.ndarray) -> np.ndarray:
        return np.bincount(arr.ravel(), minlength=self.T).astype(np.float64)

    # ---- 模拟（标准做种近似 bracket）----
    def run(self, n_sims: int = 20000, seed: int = 7) -> TournamentResult:
        rng = np.random.default_rng(seed)
        N = n_sims

        winners, runners, thirds, thirds_key = self._simulate_group_stage(rng, N)
        qual_cols, qualifying_third = self._select_best_thirds(thirds, thirds_key)

        # 32 强 = 12 头名 + 12 次名 + 8 最好第三
        qualifiers = np.concatenate([winners, runners, qualifying_third], axis=1)  # [N,32]

        # 按实力重新做种 → 标准淘汰赛树
        qual_seedval = self.seed_value[qualifiers]                 # [N,32]，唯一
        seed_order = np.argsort(-qual_seedval, axis=1)             # 强→弱列序
        seeded = np.take_along_axis(qualifiers, seed_order, axis=1)
        b_order = np.array(bracket_seed_order(32))
        bracket = seeded[:, b_order]                               # 按对阵位排列

        stage_counts: dict[str, np.ndarray] = {}
        current = bracket
        stage_counts["advance"] = self._counts(current)           # 进入 R32 = 小组出线
        for rn in self.STAGES_AFTER_GROUP:
            nm = current.shape[1] // 2
            A = current[:, 0::2]
            Bv = current[:, 1::2]
            p = self.p_adv[A, Bv]
            u = rng.random((N, nm))
            a_wins = u < p
            current = np.where(a_wins, A, Bv)
            stage_counts[rn] = self._counts(current)

        df = pd.DataFrame(
            {
                "win_group": self._counts(winners) / N,
                "runner_up": self._counts(runners) / N,
                "qualify_third": self._counts(qualifying_third) / N,
                "advance": stage_counts["advance"] / N,
                "reach_R16": stage_counts["reach_R16"] / N,
                "reach_QF": stage_counts["reach_QF"] / N,
                "reach_SF": stage_counts["reach_SF"] / N,
                "reach_Final": stage_counts["reach_Final"] / N,
                "champion": stage_counts["champion"] / N,
            },
            index=self.local_teams,
        ).sort_values("champion", ascending=False)

        return TournamentResult(probs=df, n_sims=N)
