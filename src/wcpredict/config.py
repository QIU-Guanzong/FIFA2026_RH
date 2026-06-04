"""全局常量与 2026 世界杯赛制结构。

赛制事实（已对官方/Wikipedia 核验，2026-06）：
  - 48 队，12 个小组 (A–L)，每组 4 队单循环 → 72 场小组赛
  - 每组前 2 + 8 个最好的第三名 → 32 强 (Round of 32)
  - 32 强起单淘汰：R32 → R16 → QF → SF → Final，淘汰赛 32 场 → 合计 104 场
  - 第三名排序：积分 → 净胜球 → 进球 → 行为分 → FIFA 排名
  - R32 第三名落位由 Annex C 决定（495 种组合），本 MVP 用按总排名重新做种近似
"""
from __future__ import annotations

import os
from pathlib import Path

# ---- 目录 ----
# 默认相对仓库根；可被环境变量覆盖（pip 安装/容器部署时 __file__ 指向 site-packages，
# 此时必须用 WCPREDICT_DATA_DIR / WCPREDICT_ARTIFACTS_DIR 指定，否则路径会落到 site-packages）。
ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.environ.get("WCPREDICT_DATA_DIR") or (ROOT / "data"))
ARTIFACTS_DIR = Path(os.environ.get("WCPREDICT_ARTIFACTS_DIR") or (ROOT / "artifacts"))

# ---- 2026 赛制 ----
N_TEAMS = 48
N_GROUPS = 12
GROUP_SIZE = 4
N_BEST_THIRDS = 8                      # 8 个最好的第三名晋级
GROUP_NAMES = [chr(ord("A") + i) for i in range(N_GROUPS)]  # A..L
N_GROUP_MATCHES = N_GROUPS * (GROUP_SIZE * (GROUP_SIZE - 1) // 2)  # 12*6 = 72
# 淘汰赛主线 R32→Final = 16+8+4+2+1 = 31 场；另加 1 场三四名决赛（两个半决赛负者）。
# 官方淘汰赛共 32 场 → 总场次 72+32 = 104。本模拟只关心晋级/夺冠，故不模拟三四名决赛。
N_KNOCKOUT_MAIN_MATCHES = 16 + 8 + 4 + 2 + 1                 # = 31（不含三四名决赛）
N_THIRD_PLACE_MATCH = 1
N_KNOCKOUT_MATCHES = N_KNOCKOUT_MAIN_MATCHES + N_THIRD_PLACE_MATCH  # = 32
N_TOTAL_MATCHES = N_GROUP_MATCHES + N_KNOCKOUT_MATCHES              # 72 + 32 = 104

KNOCKOUT_ROUNDS = ["R32", "R16", "QF", "SF", "Final"]
# 进入各淘汰轮的队伍数
ROUND_FIELD = {"R32": 32, "R16": 16, "QF": 8, "SF": 4, "Final": 2}

# 东道主（中立场默认；仅这三队在本土比赛享主场项）
HOSTS = ("USA", "Canada", "Mexico")

# ---- 比分矩阵 ----
MAX_GOALS = 10                         # 比分矩阵截断到 0..10 球（每方 11 档）

# ---- 加时 / 点球 ----
ET_SCALE = 30.0 / 90.0                 # 加时 30 分钟，期望进球按时间线性缩放
PENALTY_BASE_EDGE = 0.0                # 点球默认 50/50（可由实力差给微弱倾斜）

# ---- Elo 先验（FIFA SUM 思路启发）----
ELO_BASE = 1500.0
ELO_SCALE = 400.0                      # logistic 期望胜率的标度
