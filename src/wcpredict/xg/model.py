"""自建射门级 xG 模型：可解释的逻辑回归（scipy，不依赖 sklearn/黑箱）。

设计取舍（与项目"先做可解释系统"主旨一致）：
  - 仅用少量有物理含义的特征（distance/angle/is_header/is_open_play），系数可读、可符号校验。
  - 点球**不进入位置拟合**：点球转化率与位置无关，按常数 PENALTY_XG≈0.76 处理
    （历史大样本点球进球率）。把点球塞进位置回归会污染系数。
  - 真值是**进球**，不是 StatsBomb 的 statsbomb_xg。模型在留出射门上对真实进球做校准评估，
    statsbomb_xg 只作二级 sanity 交叉核对，绝不作为拟合目标。

实现：标准化连续特征后用 BFGS 最小化带 L2 的负对数似然；coef_original_ 把系数映回原始尺度便于解读。
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from scipy.optimize import minimize

from wcpredict.xg.features import FEATURE_NAMES, feature_matrix, prepare_shots

# 历史点球进球率（大样本经验值）；点球 xG 直接取常数，不进位置拟合。
PENALTY_XG = 0.76


@dataclass
class ShotXGModel:
    """少特征逻辑回归。coef_/intercept_ 在标准化空间，coef_original_ 映回原始尺度。"""

    l2: float = 1e-3
    feature_names: tuple[str, ...] = tuple(FEATURE_NAMES)
    intercept_: float = 0.0
    coef_: np.ndarray | None = None
    mean_: np.ndarray | None = None
    std_: np.ndarray | None = None

    # ---- 拟合 ----
    def fit(self, X: np.ndarray, y: np.ndarray) -> "ShotXGModel":
        X = np.asarray(X, float)
        y = np.asarray(y, float)
        self.mean_ = X.mean(axis=0)
        self.std_ = X.std(axis=0)
        self.std_[self.std_ == 0] = 1.0
        Xs = (X - self.mean_) / self.std_
        n, d = Xs.shape

        def nll(w):
            b, coef = w[0], w[1:]
            z = b + Xs @ coef
            # 数值稳定的 −loglik：Σ log(1+e^z) − y·z
            return float(np.sum(np.logaddexp(0.0, z) - y * z) + 0.5 * self.l2 * np.sum(coef ** 2))

        def grad(w):
            b, coef = w[0], w[1:]
            p = 1.0 / (1.0 + np.exp(-(b + Xs @ coef)))
            g = np.empty(d + 1)
            g[0] = np.sum(p - y)
            g[1:] = Xs.T @ (p - y) + self.l2 * coef
            return g

        res = minimize(nll, np.zeros(d + 1), jac=grad, method="BFGS")
        self.intercept_ = float(res.x[0])
        self.coef_ = res.x[1:]
        return self

    # ---- 预测 ----
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """对（非点球）射门特征矩阵给出进球概率。"""
        if self.coef_ is None:
            raise RuntimeError("模型未拟合")
        Xs = (np.asarray(X, float) - self.mean_) / self.std_
        return 1.0 / (1.0 + np.exp(-(self.intercept_ + Xs @ self.coef_)))

    @property
    def coef_original_(self) -> dict[str, float]:
        """系数映回原始特征尺度，便于符号/量级解读（含 intercept）。"""
        if self.coef_ is None:
            raise RuntimeError("模型未拟合")
        coef_raw = self.coef_ / self.std_
        intercept_raw = self.intercept_ - float(np.sum(self.coef_ * self.mean_ / self.std_))
        out = {"intercept": intercept_raw}
        out.update({name: float(c) for name, c in zip(self.feature_names, coef_raw)})
        return out


def fit_xg_model(train_df: pd.DataFrame, l2: float = 1e-3) -> ShotXGModel:
    """从射门表拟合：排除点球，对非点球射门做位置回归。train_df 需已 prepare_shots。"""
    nonpen = train_df[train_df["is_penalty"] == 0.0]
    X = feature_matrix(nonpen)
    y = nonpen["goal_int"].to_numpy(dtype=float)
    return ShotXGModel(l2=l2).fit(X, y)


def assign_xg(df: pd.DataFrame, model: ShotXGModel) -> np.ndarray:
    """给整张射门表打 xG：点球→PENALTY_XG，其余→模型预测。df 需已 prepare_shots。"""
    xg = np.empty(len(df), dtype=float)
    pen = df["is_penalty"].to_numpy() == 1.0
    xg[pen] = PENALTY_XG
    if (~pen).any():
        xg[~pen] = model.predict_proba(feature_matrix(df[~pen]))
    return xg
