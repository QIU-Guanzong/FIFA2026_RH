#!/usr/bin/env bash

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-$ROOT/.venv/bin/python}"
LOCAL_STATE_ROOT="${WCPREDICT_LOCAL_ROOT:-$HOME/FootballData}"
export WCPREDICT_DATA_DIR="${WCPREDICT_DATA_DIR:-$LOCAL_STATE_ROOT/data}"
export WCPREDICT_ARTIFACTS_DIR="${WCPREDICT_ARTIFACTS_DIR:-$LOCAL_STATE_ROOT/artifacts}"
MODEL_NAME="${MODEL_NAME:-default}"
TRAIN_SINCE="${TRAIN_SINCE:-2006-01-01}"
SIMS="${SIMS:-40000}"
SEED="${SEED:-2026}"
SLEEP_SECONDS="${SLEEP_SECONDS:-14400}"
LOG_DIR="$ROOT/logs/wc2026-upgrade"
LOG_FILE="${LOG_FILE:-$LOG_DIR/upgrade.log}"
SERVICE_URL="${SERVICE_URL:-}"
SITE_TEMPLATE="${SITE_TEMPLATE:-$ROOT/site/index.template.html}"
SITE_OUTPUT="${SITE_OUTPUT:-$ROOT/site/index.html}"
ONCE=0

if [[ "${1:-}" == "--once" ]]; then
  ONCE=1
fi

mkdir -p "$LOG_DIR" "$WCPREDICT_DATA_DIR" "$WCPREDICT_ARTIFACTS_DIR"

run_cycle() {
  local cycle_no="$1"
  local start_ts="$(date '+%F %T %z')"
  local cycle_log="$LOG_DIR/cycle-$(date +%Y%m%d-%H%M%S).log"

  local rc=0

  {
    echo "[${start_ts}] 第 ${cycle_no} 轮开始"
    echo "train model: ${MODEL_NAME}，since: ${TRAIN_SINCE}，sims: ${SIMS}，seed: ${SEED}"
    echo "data dir: ${WCPREDICT_DATA_DIR}"
    echo "artifacts dir: ${WCPREDICT_ARTIFACTS_DIR}"

    "$PYTHON_BIN" -m wcpredict.cli train --model wc2026 --name "$MODEL_NAME" --since "$TRAIN_SINCE" || rc=1

    "$PYTHON_BIN" "$ROOT/scripts/refresh_wc2026_site.py" \
      --model "$MODEL_NAME" --sims "$SIMS" --seed "$SEED" \
      --template "$SITE_TEMPLATE" --output "$SITE_OUTPUT" || rc=1

    bash "$ROOT/site/deploy.sh" || rc=1

    "$PYTHON_BIN" -m wcpredict.cli market --snapshot || true

    if [[ -n "$SERVICE_URL" ]]; then
      echo "尝试刷新服务缓存: ${SERVICE_URL}/reload"
      curl -sS -m 10 -X POST "$SERVICE_URL/reload" || {
        echo "服务未运行或刷新失败（已跳过）"
        rc=1
      }
    fi

    echo "[${start_ts}] 第 ${cycle_no} 轮完成"
  } 2>&1 | tee -a "$cycle_log" >>"$LOG_FILE"

  return "$rc"
}

echo "⚙️ 启动连续升级循环（间隔 ${SLEEP_SECONDS} 秒）"
cycle=0
while true; do
  cycle=$((cycle + 1))
  if run_cycle "$cycle"; then
    echo "第 ${cycle} 轮完成，写入日志：$LOG_FILE"
  else
    echo "第 ${cycle} 轮出现错误，记录见日志：$LOG_FILE"
  fi

  if [[ "$ONCE" -eq 1 ]]; then
    break
  fi

  echo "等待 ${SLEEP_SECONDS} 秒后继续下一轮"
  sleep "$SLEEP_SECONDS"
done
