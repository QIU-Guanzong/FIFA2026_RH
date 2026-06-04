"""射门级 xG 子包：几何特征 + 可解释逻辑回归。真值是进球，statsbomb_xg 仅二级核对。"""
from wcpredict.xg.features import (
    FEATURE_NAMES,
    feature_matrix,
    prepare_shots,
    shot_angle,
    shot_distance,
)
from wcpredict.xg.model import PENALTY_XG, ShotXGModel, assign_xg, fit_xg_model

__all__ = [
    "shot_distance",
    "shot_angle",
    "prepare_shots",
    "feature_matrix",
    "FEATURE_NAMES",
    "ShotXGModel",
    "fit_xg_model",
    "assign_xg",
    "PENALTY_XG",
]
