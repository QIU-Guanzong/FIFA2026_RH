#!/usr/bin/env bash
# 每日刷新世界杯「战报」：拉真实赛果 → 给冻结预测打分 → 部署。
# **不重训模型**（冻结 v17 不动，与已停的 4h 升级 daemon 完全独立）。
# 由 launchd com.redfootball.accuracy-refresh 每日触发；也可手动 `bash scripts/refresh_accuracy.sh`。
set -uo pipefail
REPO="$HOME/Downloads/Claude开发/Football"
PY="$REPO/.venv/bin/python"
LOG_DIR="$REPO/logs/accuracy-refresh"
mkdir -p "$LOG_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/refresh-$TS.log"

cd "$REPO" || { echo "no repo $REPO"; exit 1; }

{
  echo "=== accuracy refresh $TS ==="
  echo "[1/3] score_predictions.py（拉 martj42 实时赛果 + 打分 + 写 accuracy.js）"
  if PYTHONPATH=src "$PY" scripts/score_predictions.py; then
    echo "  score OK"
  else
    echo "  ✗ score FAILED — 中止本次刷新"; echo "=== end $TS (score fail) ==="; exit 1
  fi
  echo "[2/3] analyze_market.py（拉 Polymarket 链上盘 + 套利/分歧扫描 + 追加赔率流 + 写 market.js）"
  if PYTHONPATH=src "$PY" scripts/analyze_market.py; then
    echo "  market OK"
  else
    echo "  ⚠ market FAILED（Polymarket 拉取失败？跳过，不阻断部署）"
  fi
  echo "[3/3] deploy.sh（scp 门户 → cfd，验证 200）"
  if bash site/deploy.sh; then
    echo "  deploy OK"
  else
    echo "  ⚠ deploy FAILED（launchd 上下文可能缺 ssh-agent/keychain；本地 accuracy.js 已更新，下次手动 deploy 或修 ssh）"
  fi
  echo "=== end $TS ==="
} >> "$LOG" 2>&1

# 日志轮转：只留最近 30 份
ls -1t "$LOG_DIR"/refresh-*.log 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null || true
