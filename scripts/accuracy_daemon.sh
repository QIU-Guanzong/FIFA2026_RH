#!/usr/bin/env bash
# 无-FDA 自动刷新守护：每 INTERVAL 秒跑 refresh_accuracy.sh（score + market + deploy）。
# 经 setsid 从交互 shell 启动 → 继承「终端」的完全磁盘访问，**无需 launchd/FDA**。
#   启动: setsid nohup bash scripts/accuracy_daemon.sh >/dev/null 2>&1 & disown
#   停止: bash scripts/stop_accuracy_daemon.sh
# 局限：**不随重启自启**（macOS TCC 挡 launchd 访问 ~/Downloads；重启后需重新启动本守护）。
#   若要重启自持久：手动给 /bin/bash 完全磁盘访问，改用 com.redfootball.accuracy-refresh.plist（launchd）。
set -uo pipefail
REPO="$HOME/Downloads/Claude开发/Football"
PIDFILE="$REPO/logs/accuracy-refresh/daemon.pid"
INTERVAL="${1:-21600}"   # 默认 6h
mkdir -p "$(dirname "$PIDFILE")"

# 去重：已在跑则退出
if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE" 2>/dev/null)" 2>/dev/null; then
  echo "daemon already running pid $(cat "$PIDFILE")"; exit 0
fi
echo $$ > "$PIDFILE"
trap 'rm -f "$PIDFILE"' EXIT

while true; do
  bash "$REPO/scripts/refresh_accuracy.sh" || true
  sleep "$INTERVAL"
done
