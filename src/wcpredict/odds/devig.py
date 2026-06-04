"""赔率去水位 (de-vig) 与模型/市场概率融合。

正确做法不是照抄赔率：先把十进制赔率去掉水位(overround)得到隐含概率，
再把模型概率与市场概率做后校准/加权融合。提供三种去水位法：
  - multiplicative：按比例归一（最常用，简单稳健）
  - additive：等额扣除每个结果的水位
  - shin：估计内幕交易比例 z，缓解 favourite-longshot 偏差
"""
from __future__ import annotations

import numpy as np
from scipy.optimize import brentq


def implied_prob(odds: np.ndarray) -> np.ndarray:
    """十进制赔率 → 原始隐含概率 1/odds（未去水位，和 > 1）。"""
    odds = np.asarray(odds, dtype=float)
    if np.any(odds <= 1.0):
        raise ValueError("十进制赔率必须 > 1.0")
    return 1.0 / odds


def overround(odds: np.ndarray) -> float:
    """水位/抽水：Σ(1/odds) − 1。"""
    return float(implied_prob(odds).sum() - 1.0)


def devig_multiplicative(odds: np.ndarray) -> np.ndarray:
    """按比例归一：p_i = (1/o_i) / Σ(1/o_j)。"""
    q = implied_prob(odds)
    return q / q.sum()


def devig_additive(odds: np.ndarray) -> np.ndarray:
    """等额扣水：每个结果减去 overround/n，再裁剪归一。"""
    q = implied_prob(odds)
    n = len(q)
    p = q - (q.sum() - 1.0) / n
    p = np.clip(p, 1e-12, None)
    return p / p.sum()


def devig_shin(odds: np.ndarray) -> np.ndarray:
    """Shin (1992) 去水位：求内幕比例 z 使去水位概率之和为 1。

    p_i = [ sqrt(z² + 4(1−z)·q_i²/B) − z ] / [ 2(1−z) ],  B = Σ q_i。
    z→0 时退化为 q_i/√B；B→1（无水位）时 z→0 且 p_i→q_i。
    """
    q = implied_prob(odds)
    B = q.sum()
    if B <= 1.0 + 1e-9:  # 几乎无水位，直接归一
        return q / B

    def p_of_z(z):
        return (np.sqrt(z * z + 4.0 * (1.0 - z) * q * q / B) - z) / (2.0 * (1.0 - z))

    def f(z):
        return p_of_z(z).sum() - 1.0

    # f(0) = √B − 1 > 0；z 增大时和递减，存在唯一根
    try:
        z = brentq(f, 1e-12, 1.0 - 1e-9, xtol=1e-12)
        p = p_of_z(z)
        return p / p.sum()  # 数值兜底归一
    except (ValueError, RuntimeError):
        return devig_multiplicative(odds)


def devig(odds: np.ndarray, method: str = "multiplicative") -> np.ndarray:
    """去水位分发器。method ∈ {multiplicative, additive, shin}。"""
    fns = {
        "multiplicative": devig_multiplicative,
        "additive": devig_additive,
        "shin": devig_shin,
    }
    if method not in fns:
        raise ValueError(f"未知去水位方法: {method}（可选 {list(fns)}）")
    return fns[method](odds)


def blend_linear(p_model: np.ndarray, p_market: np.ndarray, w_model: float = 0.5) -> np.ndarray:
    """线性融合：w·模型 + (1−w)·市场，再归一。"""
    p_model = np.asarray(p_model, dtype=float)
    p_market = np.asarray(p_market, dtype=float)
    p = w_model * p_model + (1.0 - w_model) * p_market
    return p / p.sum()


def blend_log(p_model: np.ndarray, p_market: np.ndarray, w_model: float = 0.5) -> np.ndarray:
    """对数意见池（几何加权）：exp(w·log模型 + (1−w)·log市场)，再归一。

    比线性融合更尊重小概率，常用于概率预测的后校准。
    """
    p_model = np.clip(np.asarray(p_model, dtype=float), 1e-12, None)
    p_market = np.clip(np.asarray(p_market, dtype=float), 1e-12, None)
    log_p = w_model * np.log(p_model) + (1.0 - w_model) * np.log(p_market)
    p = np.exp(log_p - log_p.max())
    return p / p.sum()
