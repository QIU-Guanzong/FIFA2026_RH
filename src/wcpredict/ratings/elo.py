"""国际赛 Elo rating —— FIFA SUM 思路启发的实力先验。

不直接照抄 FIFA 排名名次，而是用"按比赛重要性加权、按结果增量更新"的思想，
自建国际赛 rating，并支持中立场、净胜球放大。

更新式：R ← R + I·g·(W − Wₑ)，Wₑ = 1 / (1 + 10^(−Δ/scale))，Δ 含主场修正。
"""
from __future__ import annotations

import pandas as pd

from wcpredict.config import ELO_BASE, ELO_SCALE


def goal_difference_multiplier(goal_diff: int) -> float:
    """净胜球放大（World Football Elo 风格）：大胜带来更大评分变动。"""
    d = abs(int(goal_diff))
    if d <= 1:
        return 1.0
    if d == 2:
        return 1.5
    return (11.0 + d) / 8.0


class EloRating:
    def __init__(
        self,
        base: float = ELO_BASE,
        scale: float = ELO_SCALE,
        k: float = 40.0,
        home_adv: float = 65.0,
        use_goal_mult: bool = True,
        passes: int = 1,
    ):
        self.base = base
        self.scale = scale
        self.k = k
        self.home_adv = home_adv
        self.use_goal_mult = use_goal_mult
        self.passes = passes                    # 多趟暖启动：>1 用上趟终值做先验重跑，压低冷启动/洲际通胀
        self.ratings: dict[str, float] = {}
        self._initial: dict[str, float] = {}    # 本趟各队的先验初值（上一趟终值）
        self.history: list[dict] = []

    def get(self, team: str) -> float:
        # 本趟已更新值 > 先验（上趟终值）> 全局 base
        if team in self.ratings:
            return self.ratings[team]
        return self._initial.get(team, self.base)

    def expected(self, r_home: float, r_away: float) -> float:
        """主队的期望得分 Wₑ ∈ (0,1)。"""
        return 1.0 / (1.0 + 10.0 ** (-(r_home - r_away) / self.scale))

    def update_match(
        self,
        home: str,
        away: str,
        home_goals: int,
        away_goals: int,
        importance: float = 1.0,
        neutral: bool = True,
    ) -> None:
        r_home = self.get(home)
        r_away = self.get(away)
        adj_home = r_home + (0.0 if neutral else self.home_adv)
        we_home = self.expected(adj_home, r_away)

        if home_goals > away_goals:
            w = 1.0
        elif home_goals == away_goals:
            w = 0.5
        else:
            w = 0.0

        g = goal_difference_multiplier(home_goals - away_goals) if self.use_goal_mult else 1.0
        delta = self.k * importance * g * (w - we_home)
        self.ratings[home] = r_home + delta
        self.ratings[away] = r_away - delta

    def fit(
        self,
        matches: pd.DataFrame,
        *,
        home_col: str = "home",
        away_col: str = "away",
        hg_col: str = "home_goals",
        ag_col: str = "away_goals",
        importance_col: str | None = "importance",
        neutral_col: str | None = "neutral",
        passes: int | None = None,
    ) -> "EloRating":
        """按时间顺序滚动更新（假定 matches 已按日期升序）。

        多趟暖启动（passes>1）：每趟从空白计分开始，但各队"首秀初值"用上一趟终值（先验），
        其余照常更新。这样后期跨洲际比赛蕴含的强度信息会反向传播到早期对阵，迭代收敛，
        显著压低"冷启动 + 弱洲际刷分"造成的虚高。passes=1 即退化为单趟（与原行为一致）。
        """
        passes = self.passes if passes is None else passes
        if "date" in matches.columns:
            matches = matches.sort_values("date", kind="stable")
        has_imp = bool(importance_col) and importance_col in matches.columns
        has_neu = bool(neutral_col) and neutral_col in matches.columns
        # 预抽成元组列表，多趟复用（避免每趟都 iterrows）
        rows = [
            (
                getattr(r, home_col),
                getattr(r, away_col),
                int(getattr(r, hg_col)),
                int(getattr(r, ag_col)),
                float(getattr(r, importance_col)) if has_imp else 1.0,
                bool(getattr(r, neutral_col)) if has_neu else True,
            )
            for r in matches.itertuples(index=False)
        ]
        for _ in range(max(1, passes)):
            self.ratings = {}
            self.history = []
            for home, away, hg, ag, imp, neu in rows:
                self.update_match(home, away, hg, ag, importance=imp, neutral=neu)
            self._initial = dict(self.ratings)   # 本趟终值 → 下一趟先验
        return self

    def to_dict(self) -> dict[str, float]:
        return dict(self.ratings)

    def ranking(self) -> list[tuple[str, float]]:
        return sorted(self.ratings.items(), key=lambda kv: kv[1], reverse=True)
