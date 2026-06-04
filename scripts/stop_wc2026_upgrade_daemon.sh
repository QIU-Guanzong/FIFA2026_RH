#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT/logs/wc2026-upgrade/daemon.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "未检测到 PID 文件，未运行中的升级进程。"
  exit 0
fi

pid=$(cat "$PID_FILE")
if ps -p "$pid" >/dev/null 2>&1; then
  kill "$pid"
  echo "已停止进程 PID=$pid"
else
  echo "PID=$pid 不存在（可能已退出）"
fi
rm -f "$PID_FILE"

