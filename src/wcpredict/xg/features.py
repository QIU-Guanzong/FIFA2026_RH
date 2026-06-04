"""射门级 xG 的几何特征。

StatsBomb 场地坐标 120×80，进攻球门在 x=120，门柱在 y=36 与 y=44（门宽 8 码，中心 y=40）。

两个核心几何量（射门 xG 的经典主特征）：
  - distance：射门点到球门中心 (120, 40) 的欧氏距离。
  - angle：球门口在射门点处张开的夹角（subtended angle）——
           即射门点分别连向两门柱 (120,36)、(120,44) 的两向量之夹角。
           正对球门近距离→张角大（易进）；贴底线极偏位置→张角趋近 0（几乎不可能进）。

注意：这是**经典几何陷阱**——必须用门柱张角，而非到球门中心连线与某轴的夹角。
本文件对若干手算样本做了交叉核验（见 tests/test_xg.py）。
"""
from __future__ import annotations

import numpy as np
import pandas as pd

GOAL_X = 120.0
GOAL_Y = 40.0
POST_LEFT_Y = 36.0
POST_RIGHT_Y = 44.0

# 进入位置拟合的特征列（点球被排除，单独按常数处理）
FEATURE_NAMES = ["distance", "angle", "is_header", "is_open_play"]


def shot_distance(x, y):
    """射门点到球门中心 (120, 40) 的欧氏距离。"""
    return np.hypot(GOAL_X - np.asarray(x, float), GOAL_Y - np.asarray(y, float))


def shot_angle(x, y):
    """球门口在射门点张开的夹角（弧度）。

    a = 指向左门柱 (120,36) 的向量；b = 指向右门柱 (120,44) 的向量。
    angle = arccos( (a·b) / (|a||b|) )。贴底线偏出→趋 0；正对门口越近→越大。
    """
    x = np.asarray(x, float)
    y = np.asarray(y, float)
    ax, ay = GOAL_X - x, POST_LEFT_Y - y
    bx, by = GOAL_X - x, POST_RIGHT_Y - y
    dot = ax * bx + ay * by
    denom = np.hypot(ax, ay) * np.hypot(bx, by)
    cos = np.where(denom > 1e-12, dot / np.maximum(denom, 1e-12), 1.0)
    cos = np.clip(cos, -1.0, 1.0)
    return np.arccos(cos)


def prepare_shots(df: pd.DataFrame) -> pd.DataFrame:
    """在射门表上补齐特征列：distance/angle/is_header/is_open_play/is_penalty/goal_int。

    输入需含列：x, y, body_part, shot_type, goal（bool）。点球单独标注，
    不进入位置拟合（其 xG 由常数给出，见 model.PENALTY_XG）。
    """
    out = df.copy()
    out["distance"] = shot_distance(out["x"], out["y"])
    out["angle"] = shot_angle(out["x"], out["y"])
    out["is_header"] = (out["body_part"].astype("string") == "Head").astype(float)
    out["is_open_play"] = (out["shot_type"].astype("string") == "Open Play").astype(float)
    out["is_penalty"] = (out["shot_type"].astype("string") == "Penalty").astype(float)
    out["goal_int"] = out["goal"].astype(int)
    return out


def feature_matrix(df: pd.DataFrame) -> np.ndarray:
    """从已 prepare 的表取出特征矩阵 [n, len(FEATURE_NAMES)]。"""
    return df[FEATURE_NAMES].to_numpy(dtype=float)
