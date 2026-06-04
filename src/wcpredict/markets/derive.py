"""盘口派生：所有市场统一从比分矩阵 M[x,y] 导出，互相一致。

这是文档核心理念——比分分布天然产出 1X2 / 大小球 / 让球 / BTTS / 波胆，
不再为每个市场单独训练相互矛盾的子模型。
"""
from __future__ import annotations

import numpy as np


def _check(M: np.ndarray) -> np.ndarray:
    M = np.asarray(M, dtype=float)
    if M.ndim != 2 or M.shape[0] != M.shape[1]:
        raise ValueError("比分矩阵必须是方阵 [x, y]")
    return M


def outcome_1x2(M: np.ndarray) -> dict[str, float]:
    """主胜 / 平 / 客胜。x>y=主胜（严格下三角），x==y=平（对角），x<y=客胜。"""
    M = _check(M)
    return {
        "home": float(np.tril(M, -1).sum()),
        "draw": float(np.trace(M)),
        "away": float(np.triu(M, 1).sum()),
    }


def over_under(M: np.ndarray, line: float = 2.5) -> dict[str, float]:
    """大小球。整数盘口（如 2.0）会给出 push 概率。"""
    M = _check(M)
    xs, ys = np.indices(M.shape)
    totals = xs + ys
    over = float(M[totals > line].sum())
    under = float(M[totals < line].sum())
    push = float(M[totals == line].sum())  # 半盘口时恒为 0
    return {"line": line, "over": over, "under": under, "push": push}


def btts(M: np.ndarray) -> dict[str, float]:
    """双方都进球 (Both Teams To Score)。"""
    M = _check(M)
    yes = float(M[1:, 1:].sum())
    return {"yes": yes, "no": float(1.0 - yes)}


def asian_handicap(M: np.ndarray, line: float = 0.0) -> dict[str, float]:
    """让球盘（line 加在主队净胜球上）。支持整 / 半 / 四分之一盘。

    margin = x − y；主队让 line 后 (margin + line) > 0 主胜方向覆盖。
    四分之一盘（如 −0.25）拆成相邻两个半/整盘，本金各半后平均（含半赢半输）。
    """
    M = _check(M)
    four = round(line * 4)
    if four % 2 != 0:  # 四分之一盘：拆分平均
        low = (four - 1) / 4.0
        high = (four + 1) / 4.0
        a = asian_handicap(M, low)
        b = asian_handicap(M, high)
        return {
            "line": line,
            "home": 0.5 * (a["home"] + b["home"]),
            "push": 0.5 * (a["push"] + b["push"]),
            "away": 0.5 * (a["away"] + b["away"]),
        }
    xs, ys = np.indices(M.shape)
    adj = (xs - ys) + line
    return {
        "line": line,
        "home": float(M[adj > 0].sum()),
        "push": float(M[adj == 0].sum()),
        "away": float(M[adj < 0].sum()),
    }


def top_correct_scores(M: np.ndarray, n: int = 5) -> list[tuple[tuple[int, int], float]]:
    """最可能的 n 个波胆 [( (主, 客), 概率 ), ...]。"""
    M = _check(M)
    n = min(n, M.size)
    flat = np.argsort(M, axis=None)[::-1][:n]
    out = []
    for f in flat:
        x, y = np.unravel_index(f, M.shape)
        out.append(((int(x), int(y)), float(M[x, y])))
    return out


def expected_goals(M: np.ndarray) -> dict[str, float]:
    """从矩阵反推期望进球（用于自检：应≈输入 λ,μ）。"""
    M = _check(M)
    goals = np.arange(M.shape[0])
    eg_home = float((M.sum(axis=1) * goals).sum())
    eg_away = float((M.sum(axis=0) * goals).sum())
    return {"home": eg_home, "away": eg_away, "total": eg_home + eg_away}


def summarize_match(
    M: np.ndarray,
    ou_lines: tuple[float, ...] = (1.5, 2.5, 3.5),
    ah_lines: tuple[float, ...] = (-1.0, -0.5, 0.0, 0.5, 1.0),
    top_n: int = 5,
) -> dict:
    """一站式：从一个比分矩阵导出全部常用盘口。"""
    return {
        "1x2": outcome_1x2(M),
        "over_under": {line: over_under(M, line) for line in ou_lines},
        "btts": btts(M),
        "asian_handicap": {line: asian_handicap(M, line) for line in ah_lines},
        "top_scores": top_correct_scores(M, top_n),
        "expected_goals": expected_goals(M),
    }
