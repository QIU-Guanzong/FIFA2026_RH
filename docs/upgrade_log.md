# Football 门户 · 自主升级日志

格式：`时间 | 项 | 状态(done/skip/needs_review) | 备注`

- 2026-06-13 夜 | 初始化 | done | design-review 完成 F1-F6 并部署上线；cron fe8d7f3d(:08/:38) 启动自主循环；数据守护 6h 运行中。
- 2026-06-14 05:58 | A1 全局 :focus-visible 环 | done | index.html 内联，2px var(--accent) 键盘环 + 鼠标态清爽；Tab 实测 matches:focus-visible #B8472D；0 console error；375 无横滚回归；已部署线上验证。
- 2026-06-14 06:55 | A2 tab 语义 + F6 收尾 | done | 桌面 nav-links + 移动 tabbar 加 role=tablist/tab + aria-selected(随激活切换实测通过) + 唯一 id；移动 tab 内联 minHeight 42→44 收尾 F6；0 console error；已部署线上确认。aria-controls/tabpanel + 方向键 roving 留作 A2b 后续。
- 2026-06-14 06:00 战况 | skip | martj42 canonical 仍 4 场(6/11-12)，6/13 四场赛果未入 feed(滞后)；web 源对 6/13 比分不一致/未终场，按 fail-loud 纪律不手填未确认赛果，待 daemon 自动并入。
- 2026-06-14 07:00 | A2b 布局(移动 tabbar 等宽) | done(部署延后) | repeat(6,1fr) 在 flex 下失效致 7 标签左挤右侧死区~114px；.mobile-tabbar button{flex:1 1 0;min-width:0} 后各 49px 铺满，375 单行无横滚 0 error；距上次部署仅 4min 触发节流，commit 已留，下轮随部署上线。
- 2026-06-14 07:20 | A2c aria-controls+tabpanel | done | <main>→id=wc-tabpanel role=tabpanel aria-labelledby=nav-tab-{active}(随切换)；14 tab aria-controls 全解析到该 panel；0 error；已部署。roving 拆 A2d。
- 2026-06-14 07:25 | 战况更新 6/13两场 | done | Qatar 1-1 Switzerland + Brazil 1-1 Morocco(FOX/FIFA/Yahoo 核验)经 manual-bridge 入库；4→6 场；top-pick 2/6、log-loss 1.162(小样本略逊floor)、精确比分 2/6(两平局命中modal 1-1)；Haiti-Scotland/Australia-Turkey(01:00UTC)未终场待daemon。已部署 accuracy.js v202606140700。
