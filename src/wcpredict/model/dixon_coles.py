"""Dixon-Coles 比分模型 —— 分析主干的心脏。

模型 (Dixon & Coles, 1997)：
    X (主队进球) ~ Poisson(λ),  Y (客队进球) ~ Poisson(μ)
    P(X=x, Y=y) = τ_{λ,μ}(x,y) · Pois(x;λ) · Pois(y;μ)

低比分相关性修正 τ（已对照原论文核验，符号极易写反）：
    τ(0,0) = 1 − λ·μ·ρ
    τ(0,1) = 1 + λ·ρ
    τ(1,0) = 1 + μ·ρ
    τ(1,1) = 1 − ρ
    其它    = 1
ρ 约束：使上述四格 ≥ 0，即 max(−1/λ, −1/μ) ≤ ρ ≤ min(1/(λμ), 1)，实践中 ρ 为小负数。

强度结构（log-linear）：
    log λ_home = intercept + home_adv·(非中立) + att[home] + def[away]
    log λ_away = intercept                     + att[away] + def[home]
识别性约束：sum(att)=0, sum(def)=0。def 越负=防守越强（压低对手 λ）。
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, Sequence

import numpy as np
from scipy.optimize import minimize
from scipy.stats import poisson

from wcpredict.config import MAX_GOALS

# 极小正数，防止 log(0) 与 tau 取到非正
_TINY = 1e-12


def dixon_coles_tau(
    x: np.ndarray | int,
    y: np.ndarray | int,
    lam: np.ndarray | float,
    mu: np.ndarray | float,
    rho: float,
) -> np.ndarray:
    """向量化 τ 修正。x,y 为进球数（可广播），lam,mu 为期望进球。"""
    x = np.asarray(x)
    y = np.asarray(y)
    lam = np.asarray(lam, dtype=float)
    mu = np.asarray(mu, dtype=float)
    tau = np.ones(np.broadcast_shapes(x.shape, y.shape, lam.shape, mu.shape), dtype=float)

    m00 = (x == 0) & (y == 0)
    m01 = (x == 0) & (y == 1)
    m10 = (x == 1) & (y == 0)
    m11 = (x == 1) & (y == 1)

    lam_b, mu_b = np.broadcast_arrays(lam, mu)
    tau = np.where(m00, 1.0 - lam_b * mu_b * rho, tau)
    tau = np.where(m01, 1.0 + lam_b * rho, tau)
    tau = np.where(m10, 1.0 + mu_b * rho, tau)
    tau = np.where(m11, 1.0 - rho, tau)
    return tau


def score_matrix(
    lam: float,
    mu: float,
    rho: float = 0.0,
    max_goals: int = MAX_GOALS,
) -> np.ndarray:
    """构造 τ 修正后的比分矩阵 M[x, y] = P(主队 x 球, 客队 y 球)。

    在 0..max_goals 截断并归一化（截断尾部很小，归一化后即合法离散分布）。
    """
    goals = np.arange(max_goals + 1)
    p_home = poisson.pmf(goals, lam)          # P(X=x)
    p_away = poisson.pmf(goals, mu)           # P(Y=y)
    mat = np.outer(p_home, p_away)            # [x, y]

    # 仅四个低比分格应用 τ
    mat[0, 0] *= 1.0 - lam * mu * rho
    mat[0, 1] *= 1.0 + lam * rho
    mat[1, 0] *= 1.0 + mu * rho
    mat[1, 1] *= 1.0 - rho

    np.clip(mat, 0.0, None, out=mat)          # 极端 ρ 下的数值兜底
    total = mat.sum()
    if total <= 0:
        raise ValueError(f"比分矩阵归一化失败 (lam={lam}, mu={mu}, rho={rho})")
    mat /= total
    return mat


@dataclass
class DixonColesParams:
    """模型参数容器。teams 顺序与 attack/defence 数组对齐。"""

    teams: list[str]
    attack: np.ndarray            # shape [T]
    defence: np.ndarray           # shape [T]
    intercept: float
    home_adv: float
    rho: float
    index: dict[str, int] = field(init=False)

    def __post_init__(self) -> None:
        self.attack = np.asarray(self.attack, dtype=float)
        self.defence = np.asarray(self.defence, dtype=float)
        self.index = {t: i for i, t in enumerate(self.teams)}

    # ---- λ 计算 ----
    def lambdas(self, home: str, away: str, neutral: bool = True) -> tuple[float, float]:
        """返回 (λ_home, μ_away)。neutral=True 时不加主场项（世界杯默认中立）。"""
        i, j = self.index[home], self.index[away]
        ha = 0.0 if neutral else self.home_adv
        log_lh = self.intercept + ha + self.attack[i] + self.defence[j]
        log_la = self.intercept + self.attack[j] + self.defence[i]
        return float(np.exp(log_lh)), float(np.exp(log_la))

    @classmethod
    def from_ratings(
        cls,
        ratings: Mapping[str, float],
        *,
        base_goals: float = 1.35,
        goals_scale: float | str = 0.0018,
        rho: float = -0.05,
        home_adv: float = 0.25,
    ) -> "DixonColesParams":
        """国际赛 rating 先验 → DC 参数（适合国家队样本稀疏、靠 Elo 定强弱）。

        把单一实力评分映射成对称的 attack/defence：强队进得多、丢得少。
        log λ ≈ log(base_goals) ± goals_scale·(R − R̄)。goals_scale 控制评分差→进球强度的灵敏度。
        goals_scale="auto"：自动用 0.35 / (2·sd(ratings))，与 cli.py 部署路径对齐。
        """
        teams = list(ratings.keys())
        r = np.array([ratings[t] for t in teams], dtype=float)
        r_centered = r - r.mean()
        if goals_scale == "auto":
            sd = float(np.std(r))
            goals_scale = 0.35 / (2 * sd) if sd > 0 else 0.0015
        attack = float(goals_scale) * r_centered   # 强队 attack 正
        defence = -float(goals_scale) * r_centered  # 强队 defence 负（压低对手）
        intercept = float(np.log(base_goals))
        return cls(
            teams=teams,
            attack=attack,
            defence=defence,
            intercept=intercept,
            home_adv=home_adv,
            rho=rho,
        )


class DixonColesModel:
    """Dixon-Coles 比分模型：拟合 / 预测比分矩阵。"""

    def __init__(self, params: DixonColesParams | None = None, max_goals: int = MAX_GOALS):
        self.params = params
        self.max_goals = max_goals

    # ---- 预测 ----
    def predict_matrix(self, home: str, away: str, neutral: bool = True) -> np.ndarray:
        if self.params is None:
            raise RuntimeError("模型尚未拟合或未提供参数")
        lam, mu = self.params.lambdas(home, away, neutral=neutral)
        return score_matrix(lam, mu, rho=self.params.rho, max_goals=self.max_goals)

    def predict_lambdas(self, home: str, away: str, neutral: bool = True) -> tuple[float, float]:
        assert self.params is not None
        return self.params.lambdas(home, away, neutral=neutral)

    # ---- 拟合 (MLE) ----
    def fit(
        self,
        home_teams: Sequence[str],
        away_teams: Sequence[str],
        home_goals: Sequence[int],
        away_goals: Sequence[int],
        *,
        neutral: Sequence[bool] | None = None,
        weights: Sequence[float] | None = None,
        teams: Sequence[str] | None = None,
        maxiter: int = 200,
    ) -> "DixonColesModel":
        """对一批比赛做时间加权极大似然估计。

        weights：每场样本权重（如 Dixon-Coles 的指数时间衰减 φ(t)），None 为等权。
        teams：显式指定球队全集与顺序（保证未在训练集出现的队也有参数位）。
        """
        hg = np.asarray(home_goals, dtype=int)
        ag = np.asarray(away_goals, dtype=int)
        n = len(hg)
        if neutral is None:
            neu = np.zeros(n, dtype=bool)          # 训练数据默认含主场（联赛/俱乐部）
        else:
            neu = np.asarray(neutral, dtype=bool)
        w = np.ones(n) if weights is None else np.asarray(weights, dtype=float)

        if teams is None:
            teams = sorted(set(home_teams) | set(away_teams))
        teams = list(teams)
        idx = {t: i for i, t in enumerate(teams)}
        T = len(teams)
        hi = np.array([idx[t] for t in home_teams])
        ai = np.array([idx[t] for t in away_teams])

        # 参数打包: [attack(T), defence(T), intercept, home_adv, rho]
        # 初值
        mean_goals = max((hg.sum() + ag.sum()) / (2 * n), 0.1)
        x0 = np.concatenate([
            np.zeros(T),                 # attack
            np.zeros(T),                 # defence
            [np.log(mean_goals)],        # intercept
            [0.2],                       # home_adv
            [-0.05],                     # rho
        ])

        def unpack(theta):
            att = theta[:T]
            de = theta[T:2 * T]
            intercept = theta[2 * T]
            home_adv = theta[2 * T + 1]
            rho = theta[2 * T + 2]
            return att, de, intercept, home_adv, rho

        def neg_log_lik(theta):
            att, de, intercept, home_adv, rho = unpack(theta)
            ha = np.where(neu, 0.0, home_adv)
            log_lh = intercept + ha + att[hi] + de[ai]
            log_la = intercept + att[ai] + de[hi]
            lam = np.exp(log_lh)
            mu = np.exp(log_la)
            ll = poisson.logpmf(hg, lam) + poisson.logpmf(ag, mu)
            tau = dixon_coles_tau(hg, ag, lam, mu, rho)
            ll = ll + np.log(np.clip(tau, _TINY, None))
            return -np.sum(w * ll)

        # 识别性：sum(att)=0, sum(def)=0
        constraints = [
            {"type": "eq", "fun": lambda th: np.sum(th[:T])},
            {"type": "eq", "fun": lambda th: np.sum(th[T:2 * T])},
        ]
        bounds = [(-3, 3)] * T + [(-3, 3)] * T + [(-2, 2), (-1, 1), (-0.2, 0.2)]

        res = minimize(
            neg_log_lik,
            x0,
            method="SLSQP",
            bounds=bounds,
            constraints=constraints,
            options={"maxiter": maxiter, "ftol": 1e-7},
        )
        if not res.success:
            raise RuntimeError(
                "Dixon-Coles 优化失败: "
                f"status={res.status}, nit={getattr(res, 'nit', None)}, fun={getattr(res, 'fun', None)}, "
                f"message={res.message}"
            )
        att, de, intercept, home_adv, rho = unpack(res.x)
        self.params = DixonColesParams(
            teams=teams,
            attack=att,
            defence=de,
            intercept=float(intercept),
            home_adv=float(home_adv),
            rho=float(rho),
        )
        self.fit_result_ = res
        return self


def exp_time_weights(days_ago: np.ndarray, xi: float = 0.0019) -> np.ndarray:
    """Dixon-Coles 指数时间衰减 φ(t)=exp(−ξ·Δt_days)。ξ≈0.0019 ≈ 半衰期一年。"""
    return np.exp(-xi * np.asarray(days_ago, dtype=float))
