#!/usr/bin/env bash
# 把 FIFA2026 预测展示页部署到 gavin.astock.top/AI4Future/FIFA2026/
# 目标服务器 = ssh 别名 cfd (47.236.141.79)，nginx root=/var/www/gavin（server_name gavin.astock.top）。
# nginx 用 root + try_files $uri/，故 FIFA2026/index.html 直接 serve，无需改 nginx、无需 reload。
# 注意：本机解析 astock.top 走本地代理(fake-IP 198.18.x.x)，curl 可达；部署走 ssh cfd 直连。
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REMOTE="${REMOTE:-cfd}"
DEST="/var/www/gavin/AI4Future/FIFA2026"
URL="https://gavin.astock.top/AI4Future/FIFA2026/"

echo "▶ 建目录 + 上传 index.html → $REMOTE:$DEST"
ssh -o ConnectTimeout=15 "$REMOTE" "mkdir -p $DEST"
scp -o ConnectTimeout=15 "$HERE/index.html" "$REMOTE:$DEST/index.html"
ssh -o ConnectTimeout=15 "$REMOTE" "chown www-data:www-data $DEST/index.html && chmod 644 $DEST/index.html && chmod 755 $DEST"

echo "▶ 验证（应 200）"
code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$URL" || echo FAIL)
echo "  HTTP $code  →  $URL"
[ "$code" = "200" ] && echo "✓ 部署成功" || { echo "✗ 验证失败"; exit 1; }
