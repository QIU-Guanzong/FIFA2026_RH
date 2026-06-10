#!/usr/bin/env bash
# 重新编译 src/*.jsx → assets/*.js（改了 JSX 之后跑；部署本身不需要 Node）
set -euo pipefail
cd "$(dirname "$0")"
npx -y -p @babel/core -p @babel/cli -p @babel/preset-react \
  babel --presets @babel/preset-react src --out-dir assets --compact false
# 关键：预编译后所有 <script> 共享全局作用域（原型里 Babel 给每段脚本独立作用域），
# 各文件的 const { useState } 解构会相互冲突 → 逐文件包 IIFE（组件已经 Object.assign(window) 导出）
python3 - <<'PY'
import pathlib
for p in pathlib.Path('assets').glob('*.js'):
    if p.name in {'data.js','dc.js','fixtures.js','bracket.js','polymarket.js','api.js','engine.js'}:
        continue   # 这些本就是 IIFE/纯赋值
    s = p.read_text()
    if not s.startswith(';(function'):
        p.write_text(';(function () {\n' + s + '\n})();\n')
PY
echo "✓ 编译完成 → assets/"
