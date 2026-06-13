# Football 门户 · 自主持续升级 Playbook

CEO Gavin 2026-06-13 夜间授权：自主持续升级，不必逐次询问，AI 自行推荐决策。
本文件是无人值守迭代循环的**唯一事实源**。每次 cron 触发按此执行。

## 硬安全门（不可违反）

1. **范围限定**：仅前端 / a11y / 视觉 polish / 门户文案。
   **禁止**自主改：Dixon-Coles 模型、Elo、评分/冻结预测、比分/概率逻辑、
   服务费、any 金融/下注语义、`scripts/` 数据管线核心、删除数据。这些等 Gavin 回来。
2. **始终 git commit**（可回滚）。一处一 commit，`style(design):` / `a11y:` 前缀。
3. **部署门**：仅当本地验证**全通过**才 `bash site/deploy.sh`：
   - `node -c` 所有改动 JS 通过；改动 py 则 `pytest` 全绿；
   - 本地 http server + Playwright：无 console error（favicon 404 除外）、
     375px 无横向滚动、1280px 无回归。
   - 任一不过 → commit 保留但**不部署**，标记 `NEEDS_REVIEW`，记日志，继续下一项。
4. **部署节流**：距上次部署 <25min 则本轮跳过部署（攒着下轮），避免 fail2ban 封 IP。
   改动 JS/CSS **必 bump `?v=` 缓存版本**否则线上吃旧缓存。
5. **停止条件**：backlog 清空 / 连续 2 轮失败 / 风险升高 → `CronDelete` 自停 + 写总结。
6. 每轮把进度追加到 `docs/upgrade_log.md`（done/skip/原因）。

## 单轮流程

1. 读本文件 backlog，取**最上面未完成**项。
2. 实现（CSS-first，最小改动）。
3. 本地验证（上面部署门的检查）。
4. commit。通过门则 bump 版本 + 部署 + 线上 curl 验证。
5. backlog 勾掉该项，写 `docs/upgrade_log.md`。
6. 不调度下一次（cron 自身周期触发）。

## Backlog（优先级从高到低）

- [x] A1 全局 `:focus-visible` 环（tokens.css：`outline:2px solid var(--accent);outline-offset:2px`，去掉依赖默认 outline:auto）。CSS，安全。
- [x] A2 Tab 语义：导航 tab 加 `role=tablist/tab`、`aria-selected`、`aria-controls`（sections1.js:~240 + mobile-tabbar）。
- [ ] A2b tab 补全：aria-controls→tabpanel(app.js 内容容器加 id/role=tabpanel) + 方向键 roving tabindex；移动 tabbar 7 标签 flex 均分(当前 repeat(6) 失效)
- [ ] A3 弹窗 a11y：`role=dialog` `aria-modal` `aria-labelledby` + 关闭后焦点归还（sections4.js:296、sections7.js:272）。
- [ ] A4 可点卡片 → `<button>`/`role=button`+`onKeyDown`(Enter/Space)+`tabIndex`（sections4.js:79、sections7.js:167）。
- [ ] A5 晋级树 `minWidth:920` 移动端改为横向滚动容器内可读（已有 overflow，确认 375 不撑破页面+加滚动提示）（sections6.js:625）。
- [ ] P1 杂散 `Arial` 字体来源定位并归一到字体 token。
- [ ] P2 组件内联 hex/rgba 字面量替换为语义变量（sections1.js:285、sections3.js:499 等 Codex 标记处），分小批。
- [ ] P3 战报/列表 decorative 左边框卡片（sections8.js:104）视觉去同质化（轻量）。
- [ ] P4 复跑 design-review 关键检查（contrast 全 token、touch target、responsive 880/560 断点），回归则修。

## 当前状态
- 已完成（本次会话，design-review）：F1 赞助蓝链 / F2 muted 对比度 / F3 移动横滚 / F4 favicon / F5 H1 响应式 / F6 触控目标。
- 数据刷新：accuracy_daemon.sh 6h 周期运行中（pid 见 logs/accuracy-refresh/daemon.pid）。
