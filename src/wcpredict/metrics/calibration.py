"""概率校准评估：log loss / Brier / reliability。

评估以概率质量为主，而非命中率。Brier 与 log loss 同时受可靠性(reliability)
与分辨力(resolution)影响，因此不能只看单一总分，需配合可靠性曲线。
"""
from __future__ import annotations

import numpy as np


def log_loss(y_idx: np.ndarray, P: np.ndarray, eps: float = 1e-15) -> float:
    """多分类 log loss。y_idx：整数标签 [n]；P：概率 [n, K]。"""
    P = np.asarray(P, dtype=float)
    y_idx = np.asarray(y_idx, dtype=int)
    P = np.clip(P, eps, 1.0)
    P = P / P.sum(axis=1, keepdims=True)
    n = len(y_idx)
    return float(-np.mean(np.log(P[np.arange(n), y_idx])))


def brier_score(y_idx: np.ndarray, P: np.ndarray) -> float:
    """多分类 Brier 分数：mean Σ_k (p_k − y_k)²。"""
    P = np.asarray(P, dtype=float)
    y_idx = np.asarray(y_idx, dtype=int)
    n, K = P.shape
    Y = np.zeros((n, K))
    Y[np.arange(n), y_idx] = 1.0
    return float(np.mean(np.sum((P - Y) ** 2, axis=1)))


def reliability_curve(
    y_binary: np.ndarray, p_pred: np.ndarray, n_bins: int = 10
) -> dict[str, np.ndarray]:
    """二分类可靠性曲线（用于某结果的一对多校准）。

    返回每个分箱的：平均预测概率、实际发生频率、样本数。
    """
    y_binary = np.asarray(y_binary, dtype=float)
    p_pred = np.asarray(p_pred, dtype=float)
    edges = np.linspace(0.0, 1.0, n_bins + 1)
    ids = np.clip(np.digitize(p_pred, edges) - 1, 0, n_bins - 1)

    mean_pred = np.full(n_bins, np.nan)
    frac_pos = np.full(n_bins, np.nan)
    count = np.zeros(n_bins, dtype=int)
    for b in range(n_bins):
        mask = ids == b
        count[b] = int(mask.sum())
        if count[b] > 0:
            mean_pred[b] = p_pred[mask].mean()
            frac_pos[b] = y_binary[mask].mean()
    return {"mean_pred": mean_pred, "frac_pos": frac_pos, "count": count, "edges": edges}


def expected_calibration_error(
    y_binary: np.ndarray, p_pred: np.ndarray, n_bins: int = 10
) -> float:
    """ECE：各分箱 |平均预测 − 实际频率| 按样本量加权平均。"""
    rc = reliability_curve(y_binary, p_pred, n_bins)
    count = rc["count"]
    total = count.sum()
    if total == 0:
        return float("nan")
    gap = np.abs(rc["mean_pred"] - rc["frac_pos"])
    valid = count > 0
    return float(np.sum(gap[valid] * count[valid]) / total)


def evaluate_1x2(outcomes: np.ndarray, probs: np.ndarray) -> dict[str, float]:
    """对一批 1X2 预测做整体评估。

    outcomes：整数 [n]，0=主胜 1=平 2=客胜（与 probs 列序一致）。
    probs：[n, 3]。
    """
    probs = np.asarray(probs, dtype=float)
    outcomes = np.asarray(outcomes, dtype=int)
    out = {
        "log_loss": log_loss(outcomes, probs),
        "brier": brier_score(outcomes, probs),
        "n": int(len(outcomes)),
    }
    # 每类的 ECE（一对多）
    for k, name in enumerate(["home", "draw", "away"]):
        y_bin = (outcomes == k).astype(float)
        out[f"ece_{name}"] = expected_calibration_error(y_bin, probs[:, k])
    return out
