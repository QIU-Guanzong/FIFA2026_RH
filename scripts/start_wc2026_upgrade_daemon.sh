#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT/logs/wc2026-upgrade/daemon.pid"
LOG_FILE="${LOG_FILE:-$ROOT/logs/wc2026-upgrade/daemon.log}"
RUN_SCRIPT="$ROOT/scripts/run_wc2026_upgrade_loop.sh"

mkdir -p "$ROOT/logs/wc2026-upgrade"

if [[ -f "$PID_FILE" ]]; then
  old_pid=$(cat "$PID_FILE")
  if ps -p "$old_pid" >/dev/null 2>&1; then
    echo "检测到已有进程运行：PID=$old_pid"
    exit 1
  fi
  rm -f "$PID_FILE"
fi

if command -v setsid >/dev/null 2>&1; then
  nohup setsid bash "$RUN_SCRIPT" \
    >>"$LOG_FILE" 2>&1 </dev/null &
else
  nohup bash "$RUN_SCRIPT" \
    >>"$LOG_FILE" 2>&1 </dev/null &
fi

pid=$!
if ! ps -p "$pid" >/dev/null 2>&1; then
  # 某些平台下 `nohup`/`setsid` 的调度行为不同，回退抓取实际运行中的脚本 pid。
  pid=$(pgrep -f "bash $RUN_SCRIPT" | tail -n 1 || true)
fi

if [[ -z "$pid" ]] || ! ps -p "$pid" >/dev/null 2>&1; then
  echo "启动失败：未检测到后台循环进程，请检查日志 $LOG_FILE" >&2
  exit 1
fi

echo "$pid" >"$PID_FILE"
echo "已开启后台循环：PID=$pid"
echo "日志：$LOG_FILE"
