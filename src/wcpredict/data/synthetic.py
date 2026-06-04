"""合成数据：从已知 DC 参数生成比赛，既驱动 demo，也作为流水线正确性闸门。

诚实声明：合成数据只验证"机器是否算对"（拟合能否复原参数、指标是否算对、
赛制模拟是否自洽），**不验证预测准确度**。校准与边际优势的真实结论必须等
接入真实数据 + 严格 cutoff 回测后才能下。
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from wcpredict.model.dixon_coles import DixonColesParams, score_matrix


def _zero_sum(x: np.ndarray) -> np.ndarray:
    return x - x.mean()


def generate_true_params(
    n_teams: int = 48,
    seed: int = 1,
    *,
    intercept: float | None = None,
    home_adv: float = 0.25,
    rho: float = -0.06,
    name_prefix: str = "T",
) -> DixonColesParams:
    """生成一组"真值" DC 参数：强队进得多、丢得少（att 与 def 负相关）。"""
    rng = np.random.default_rng(seed)
    teams = [f"{name_prefix}{i + 1:02d}" for i in range(n_teams)]
    latent = rng.normal(0.0, 1.0, n_teams)             # 隐含实力
    attack = _zero_sum(0.32 * latent + rng.normal(0, 0.10, n_teams))
    defence = _zero_sum(-0.27 * latent + rng.normal(0, 0.10, n_teams))
    if intercept is None:
        intercept = float(np.log(1.35))
    return DixonColesParams(
        teams=teams, attack=attack, defence=defence,
        intercept=intercept, home_adv=home_adv, rho=rho,
    )


def simulate_history(
    params: DixonColesParams,
    n_matches: int = 3000,
    seed: int = 2,
    *,
    neutral_prob: float = 0.35,
    days_span: int = 1400,
) -> pd.DataFrame:
    """从 DC 真值参数抽样一段比赛历史（含中立场比例、距今天数用于时间衰减）。"""
    rng = np.random.default_rng(seed)
    teams = params.teams
    n = len(teams)
    W = 11
    cells = np.arange(W * W)
    gh_cells = cells // W
    ga_cells = cells % W

    home_idx = rng.integers(0, n, n_matches)
    away_idx = rng.integers(0, n, n_matches)
    same = home_idx == away_idx
    away_idx[same] = (away_idx[same] + 1) % n          # 避免自己打自己
    neutral = rng.random(n_matches) < neutral_prob
    days_ago = np.sort(rng.integers(0, days_span, n_matches))[::-1]  # 越靠后越新

    hg = np.empty(n_matches, dtype=int)
    ag = np.empty(n_matches, dtype=int)
    for m in range(n_matches):
        h, a = teams[home_idx[m]], teams[away_idx[m]]
        lam, mu = params.lambdas(h, a, neutral=bool(neutral[m]))
        M = score_matrix(lam, mu, params.rho, max_goals=W - 1)
        flat = M.ravel()
        flat = flat / flat.sum()
        c = rng.choice(W * W, p=flat)
        hg[m] = gh_cells[c]
        ag[m] = ga_cells[c]

    return pd.DataFrame(
        {
            "home": [teams[i] for i in home_idx],
            "away": [teams[i] for i in away_idx],
            "home_goals": hg,
            "away_goals": ag,
            "neutral": neutral,
            "days_ago": days_ago,
            "importance": 1.0,
        }
    )


def make_recovery_world(
    n_teams: int = 12, n_matches: int = 3000, seed: int = 0
) -> tuple[DixonColesParams, pd.DataFrame]:
    """小规模世界，用于参数复原测试（队少 → 拟合快、复原干净）。"""
    params = generate_true_params(n_teams=n_teams, seed=seed)
    history = simulate_history(params, n_matches=n_matches, seed=seed + 100)
    return params, history


def make_world_48(
    seed: int = 42, n_matches: int = 2600
) -> tuple[DixonColesParams, pd.DataFrame]:
    """48 队世界 + 比赛历史，用于端到端世界杯模拟 demo。"""
    params = generate_true_params(n_teams=48, seed=seed)
    history = simulate_history(params, n_matches=n_matches, seed=seed + 1)
    return params, history


def save_history_parquet(history: pd.DataFrame, path: str | Path) -> Path:
    """落原始数据为 Parquet（本地数据层第一站）。"""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    history.to_parquet(path, index=False)
    return path
