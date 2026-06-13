# Football 门户 · 自主升级日志

格式：`时间 | 项 | 状态(done/skip/needs_review) | 备注`

- 2026-06-13 夜 | 初始化 | done | design-review 完成 F1-F6 并部署上线；cron fe8d7f3d(:08/:38) 启动自主循环；数据守护 6h 运行中。
- 2026-06-14 05:58 | A1 全局 :focus-visible 环 | done | index.html 内联，2px var(--accent) 键盘环 + 鼠标态清爽；Tab 实测 matches:focus-visible #B8472D；0 console error；375 无横滚回归；已部署线上验证。
- 2026-06-14 06:55 | A2 tab 语义 + F6 收尾 | done | 桌面 nav-links + 移动 tabbar 加 role=tablist/tab + aria-selected(随激活切换实测通过) + 唯一 id；移动 tab 内联 minHeight 42→44 收尾 F6；0 console error；已部署线上确认。aria-controls/tabpanel + 方向键 roving 留作 A2b 后续。
- 2026-06-14 06:00 战况 | skip | martj42 canonical 仍 4 场(6/11-12)，6/13 四场赛果未入 feed(滞后)；web 源对 6/13 比分不一致/未终场，按 fail-loud 纪律不手填未确认赛果，待 daemon 自动并入。
