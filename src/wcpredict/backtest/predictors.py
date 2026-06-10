"""回测用预测器：统一 fit/predict 协议，喂给 walk-forward 引擎。

协议刻意极简，强制时间纪律由引擎（walkforward.py）保证：
    fit(train_matches)          # 只会被传入 cutoff 之前的比赛
    predict_1x2(home, away, neutral) -> [P主, P平, P客]

预测器只负责"模型"；市场基准由引擎单独从赔率去水位得到，二者在同一持出集上比较。
"""
from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np
import pandas as pd

from wcpredict.config import MAX_GOALS
from wcpredict.markets import outcome_1x2
from wcpredict.model.dixon_coles import (
    DixonColesModel,
    DixonColesParams,
    exp_time_weights,
    score_matrix,
)
from wcpredict.ratings.elo import EloRating


def _predict_1x2_from_params(
    params: DixonColesParams, home: str, away: str, neutral: bool, max_goals: int
) -> np.ndarray:
    """用 DC 参数出 1X2；未见过的队按"平均队"(att=def=0) 兜底（避免 KeyError 泄漏未来信息）。"""
    idx = params.index

    def ad(team: str) -> tuple[float, float]:
        if team in idx:
            i = idx[team]
            return float(params.attack[i]), float(params.defence[i])
        return 0.0, 0.0

    ah, dh = ad(home)
    aa, da = ad(away)
    ha = 0.0 if neutral else params.home_adv
    lam = float(np.exp(params.intercept + ha + ah + da))
    mu = float(np.exp(params.intercept + aa + dh))
    o = outcome_1x2(score_matrix(lam, mu, params.rho, max_goals))
    return np.array([o["home"], o["draw"], o["away"]])


class Predictor(ABC):
    name: str = "base"

    @abstractmethod
    def fit(self, train: pd.DataFrame) -> None: ...

    @abstractmethod
    def predict_1x2(self, home: str, away: str, neutral: bool) -> np.ndarray: ...


class DCFitPredictor(Predictor):
    """对 cutoff 前比赛做时间加权 MLE 拟合 Dixon-Coles。"""

    name = "dc-fit"

    def __init__(self, max_goals: int = MAX_GOALS, maxiter: int = 80, l2: float = 0.0):
        self.max_goals = max_goals
        self.maxiter = maxiter
        self.l2 = l2
        self.params: DixonColesParams | None = None

    def fit(self, train: pd.DataFrame) -> None:
        cutoff = train["date"].max()
        days_ago = (cutoff - pd.to_datetime(train["date"])).dt.days.clip(lower=0).to_numpy()
        weights = exp_time_weights(days_ago) * train["importance"].to_numpy()
        teams = sorted(set(train["home"]) | set(train["away"]))
        model = DixonColesModel(max_goals=self.max_goals).fit(
            train["home"], train["away"], train["home_goals"], train["away_goals"],
            neutral=train["neutral"], weights=weights, teams=teams, maxiter=self.maxiter,
            l2=self.l2,
        )
        self.params = model.params

    def predict_1x2(self, home: str, away: str, neutral: bool) -> np.ndarray:
        if self.params is None:
            raise RuntimeError("predictor 未拟合")
        return _predict_1x2_from_params(self.params, home, away, neutral, self.max_goals)


class EloPredictor(Predictor):
    """Elo 评分（cutoff 前滚动）→ rating 先验 DC 参数 → 1X2。比 MLE 快很多。"""

    name = "elo-prior"

    def __init__(self, max_goals: int = MAX_GOALS, goals_scale: float | str = 0.0018,
                 rho: float = -0.05, passes: int = 1):
        self.max_goals = max_goals
        self.goals_scale = goals_scale
        self.rho = rho
        self.passes = passes
        self.params: DixonColesParams | None = None

    def fit(self, train: pd.DataFrame) -> None:
        elo = EloRating(passes=self.passes)
        elo.fit(train)
        ratings = elo.to_dict()
        if not ratings:
            raise RuntimeError("Elo 训练集为空")
        self.params = DixonColesParams.from_ratings(
            ratings, goals_scale=self.goals_scale, rho=self.rho, home_adv=0.25
        )

    def predict_1x2(self, home: str, away: str, neutral: bool) -> np.ndarray:
        if self.params is None:
            raise RuntimeError("predictor 未拟合")
        return _predict_1x2_from_params(self.params, home, away, neutral, self.max_goals)
