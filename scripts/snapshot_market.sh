#!/usr/bin/env bash
# 每 4h 抓 Polymarket WC2026 夺冠盘快照，写入 ~/FootballData/data/market_snapshots.parquet
# 由 launchd plist 驱动（com.gavin.wcpredict.market-snapshot）；也可直接 bash scripts/snapshot_market.sh
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
export WCPREDICT_DATA_DIR="${WCPREDICT_DATA_DIR:-$HOME/FootballData/data}"
export WCPREDICT_ARTIFACTS_DIR="${WCPREDICT_ARTIFACTS_DIR:-$HOME/FootballData/artifacts}"

mkdir -p "$WCPREDICT_DATA_DIR"

PYTHON="${REPO}/.venv/bin/python"
[ -x "$PYTHON" ] || PYTHON="$(command -v python3)"

LOG_DIR="${REPO}/logs/market-snapshot"
mkdir -p "$LOG_DIR"
LOGFILE="$LOG_DIR/$(date +%Y%m%d_%H%M%S).log"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] market snapshot start" | tee "$LOG_DIR/latest.log"
cd "$REPO"
PYTHONPATH="$REPO/src" "$PYTHON" -m wcpredict.cli market --snapshot 2>&1 | tee "$LOGFILE" | tee -a "$LOG_DIR/latest.log"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] market snapshot done" | tee -a "$LOG_DIR/latest.log"

# 只保留最近 7 天日志
find "$LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null || true
