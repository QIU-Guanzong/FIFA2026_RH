"""wcpredict — 可解释的世界杯比分概率预测主干。

分析链路（端到端）：
    国际赛 rating 先验  →  log-linear λ  →  Dixon-Coles 比分矩阵
                                         →  盘口派生 (1X2 / 大小球 / BTTS / 让球 / 波胆)
                                         →  赔率去水位 + 校准
                                         →  世界杯全赛事 Monte Carlo (晋级率 / 夺冠率)

设计原则：先做可解释、可回测的比分概率系统，黑箱与部署层（FastAPI/Docker）后置。
"""

__version__ = "0.1.0"

from wcpredict.model.dixon_coles import DixonColesModel, DixonColesParams
from wcpredict.ratings.elo import EloRating

__all__ = ["DixonColesModel", "DixonColesParams", "EloRating", "__version__"]
