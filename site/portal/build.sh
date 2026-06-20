#!/usr/bin/env bash
# 重新编译 src/*.jsx → assets/*.js（改了 JSX 之后跑；部署本身不需要 Node）
# ⚠️ 漂移警告：assets/*.js 曾被直接手改，与 src/*.jsx 不完全同步（如 sections3 页脚 ex-ante 文案、
#    sections1 Hero 的 RF_ASOF_MD 动态日期）。盲目重建会回退这些手改——重建前先核对 git diff，
#    必要时把手改回灌 jsx，再 build。
set -euo pipefail
cd "$(dirname "$0")"
TMP_BABEL_DIR="$(mktemp -d /tmp/redfootball-babel-XXXXXX)"
trap 'rm -rf "$TMP_BABEL_DIR"' EXIT
npm --prefix "$TMP_BABEL_DIR" install @babel/core @babel/cli @babel/preset-react >/dev/null
# 固定 classic JSX runtime：新版 @babel/preset-react 默认 automatic（emit `import jsxDEV …`），
# 与下面的 IIFE 包裹冲突 → "import outside module" 整站白屏。必须 classic（React.createElement）。
cat > "$TMP_BABEL_DIR/babel.config.json" <<JSON
{ "presets": [ ["$TMP_BABEL_DIR/node_modules/@babel/preset-react", { "runtime": "classic" }] ] }
JSON
"$TMP_BABEL_DIR/node_modules/.bin/babel" --config-file "$TMP_BABEL_DIR/babel.config.json" src --out-dir assets --compact false
# 关键：预编译后所有 <script> 共享全局作用域（原型里 Babel 给每段脚本独立作用域），
# 各文件的 const { useState } 解构会相互冲突 → 逐文件包 IIFE（组件已经 Object.assign(window) 导出）
python3 - <<'PY'
import pathlib
for p in pathlib.Path('assets').glob('*.js'):
    if p.name in {'data.js','dc.js','fixtures.js','bracket.js','polymarket.js','api.js','engine.js','accuracy.js','market.js'}:
        continue   # 这些本就是 IIFE/纯赋值
    s = p.read_text()
    if not s.startswith(';(function'):
        p.write_text(';(function () {\n' + s + '\n})();\n')
PY
echo "✓ 编译完成 → assets/"
