#!/usr/bin/env bash
# 把 FIFA2026 预测展示页部署到 gavin.astock.top/FIFA2026/（顶层路径，不挂在 AI4Future 下）
# 目标服务器 = ssh 别名 cfd (47.236.141.79)，nginx root=/var/www/gavin（server_name gavin.astock.top）。
# nginx 用 root + try_files $uri/，故 FIFA2026/index.html 直接 serve，无需改 nginx、无需 reload。
# 注意：本机解析 astock.top 走本地代理(fake-IP 198.18.x.x)，curl 可达；部署走 ssh cfd 直连。
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REMOTE="${REMOTE:-cfd}"
DEST="/var/www/gavin/FIFA2026"
URL="https://gavin.astock.top/FIFA2026/"

echo "▶ 建目录 + 上传 index.html → $REMOTE:$DEST"
ssh -o ConnectTimeout=15 "$REMOTE" "mkdir -p $DEST"
scp -o ConnectTimeout=15 "$HERE/index.html" "$REMOTE:$DEST/index.html"
ssh -o ConnectTimeout=15 "$REMOTE" "chown www-data:www-data $DEST/index.html && chmod 644 $DEST/index.html && chmod 755 $DEST"

echo "▶ 上传交互门户 portal/（index + assets + vendor；src 源码不上服务器）"
ssh -o ConnectTimeout=15 "$REMOTE" "mkdir -p $DEST/portal"
scp -o ConnectTimeout=15 -r "$HERE/portal/index.html" "$HERE/portal/assets" "$HERE/portal/vendor" "$REMOTE:$DEST/portal/"
ssh -o ConnectTimeout=15 "$REMOTE" "chown -R www-data:www-data $DEST/portal && find $DEST/portal -type d -exec chmod 755 {} + && find $DEST/portal -type f -exec chmod 644 {} +"

echo "▶ 验证（应 200）"
for u in "$URL" "${URL}portal/"; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$u" || echo FAIL)
  echo "  HTTP $code  →  $u"
  [ "$code" = "200" ] || { echo "✗ 验证失败"; exit 1; }
done
echo "✓ 部署成功"
