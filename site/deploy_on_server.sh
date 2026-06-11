#!/usr/bin/env bash
# ============================================================
# 在【服务器】上运行的部署脚本（GitHub 中转，免 Mac→服务器 SSH）
#
# 适用：Mac→服务器 22 端口不通，但服务器能访问 GitHub。
# 流程：服务器 git clone/pull 公开仓库 → 同步 site/ 到 nginx webroot → 验证 200。
#
# 用法（在服务器 shell 里，可走云厂商网页控制台进入）：
#   curl -fsSL https://raw.githubusercontent.com/QIU-Guanzong/FIFA2026_RH/main/site/deploy_on_server.sh | bash
# 或先 clone 再跑：
#   git clone --depth 1 https://github.com/QIU-Guanzong/FIFA2026_RH.git ~/FIFA2026_RH
#   bash ~/FIFA2026_RH/site/deploy_on_server.sh
# ============================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/QIU-Guanzong/FIFA2026_RH.git}"
SRC_DIR="${SRC_DIR:-$HOME/FIFA2026_RH}"
BRANCH="${BRANCH:-main}"
DEST="${DEST:-/var/www/gavin/FIFA2026}"
URL="${URL:-https://gavin.astock.top/FIFA2026/}"

# 若需 sudo 写 /var/www 则自动加 sudo；以 root 运行则留空
SUDO=""
[ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1 && SUDO="sudo"

echo "▶ 1/4 拉取仓库（$BRANCH）→ $SRC_DIR"
if [ -d "$SRC_DIR/.git" ]; then
  git -C "$SRC_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$SRC_DIR" reset --hard "origin/$BRANCH"
else
  git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$SRC_DIR"
fi

echo "▶ 2/4 同步 site/index.html + site/portal/ → $DEST"
$SUDO mkdir -p "$DEST/portal"
# 门户：先清旧 portal 再整目录拷入（避免残留已删文件）
$SUDO rm -rf "$DEST/portal"
$SUDO cp -r "$SRC_DIR/site/portal" "$DEST/portal"
# 老展示页
$SUDO cp "$SRC_DIR/site/index.html" "$DEST/index.html"

echo "▶ 3/4 修正属主与权限（www-data, 目录 755 / 文件 644）"
$SUDO chown -R www-data:www-data "$DEST"
$SUDO find "$DEST" -type d -exec chmod 755 {} +
$SUDO find "$DEST" -type f -exec chmod 644 {} +

echo "▶ 4/4 验证（应 200）"
fail=0
for u in "$URL" "${URL}portal/"; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$u" || echo FAIL)
  echo "  HTTP $code  →  $u"
  [ "$code" = "200" ] || fail=1
done
[ "$fail" = "0" ] && echo "✓ 部署成功" || { echo "✗ 有 URL 未返回 200，检查 nginx root/路径"; exit 1; }
