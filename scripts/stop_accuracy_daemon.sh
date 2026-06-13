#!/usr/bin/env bash
# 停止无-FDA 自动刷新守护（accuracy_daemon.sh）。
PIDFILE="$HOME/Downloads/Claude开发/Football/logs/accuracy-refresh/daemon.pid"
if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE" 2>/dev/null)" 2>/dev/null; then
  PID="$(cat "$PIDFILE")"
  # 杀掉守护及其当前子进程（refresh/python/ssh）
  pkill -P "$PID" 2>/dev/null || true
  kill "$PID" 2>/dev/null && echo "stopped daemon pid $PID"
  rm -f "$PIDFILE"
else
  echo "daemon not running"
  rm -f "$PIDFILE" 2>/dev/null || true
fi
