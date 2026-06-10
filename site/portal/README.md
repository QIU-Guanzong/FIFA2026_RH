# RedFootball — 2026 世界杯预测交互门户

`wcpredict` 引擎的可视化门户（claude.ai/design 设计稿 `fifa/wcpredict.html` 的生产实现）。
6 个标签页：总览 · 赛程(104 场) · 单场预测 · 晋级树 · 下注建议 · 方法&回测。
纯静态、无构建依赖，部署 = scp 整个目录（`bash ../deploy.sh`）。

## 数据流（单一真理源）

```
artifacts/models/default/latest (wc2026_official DC 参数)
  └─ scripts/export_portal_data.py        ← 刷新数字只跑这个
       ├─ OfficialWC2026Simulator 5 万届 MC (seed 2026)
       ├─ data/raw/international_results.csv → 多趟 Elo（离线缓存）
       ├─ registry 历史版本 → 冠军率趋势线（真实版本演化）
       └─ Polymarket gamma API → 构建期赔率快照
  → assets/engine.js   （WC_CHAMPIONS / WC_BRACKET / WC_PARAMS / … 全部 window 全局）
```

- `assets/engine.js` **最先加载**；`data.js / bracket.js / fixtures.js` 全部是
  `window.X = window.X || …` 兜底（engine.js 缺席时页面退回设计稿快照，永不空白）。
- **λ 与 Python 完全同式**：前端用 `WC_PARAMS`（attack/defence/intercept/rho 原样导出）算
  `λh = exp(intercept + att_h + def_a)`，已做跨语言一致性断言（4 组对阵 λ/1X2 逐位相等）。
- Polymarket 赔率运行时由 `polymarket.js` 实时拉取（90s 轮询），失败回退构建期快照。
- `api.js` 预留 FastAPI 接缝（`RF_API.enabled=true` + 填 adapt.* 即接 /tournament 等实时接口）。

## 刷新 / 重编译 / 部署

```bash
# 1. 重训模型后刷新门户数字（写 assets/engine.js）
PYTHONPATH=src python scripts/export_portal_data.py        # 仓库根目录跑

# 2. 改了 src/*.jsx 之后重编译（需要 node；纯数据刷新不用）
bash site/portal/build.sh

# 3. 部署（老展示页 + 本门户一起）
bash site/deploy.sh        # → https://gavin.astock.top/FIFA2026/portal/
```

## 目录

- `index.html` — 壳：tab 路由 + 滚动揭示守卫（默认可见，rAF 确认后才启用动画）
- `assets/*.js` — 预编译产物 + 数据层；`vendor/` — 本地 React 18.3.1（不依赖外网 CDN）
- `src/*.jsx` — JSX 源（Charts/sections1–7/app），编辑后跑 build.sh
- 设计稿来源：claude.ai/design 项目「FIFA」，handoff 包内含完整设计意图与交互说明
