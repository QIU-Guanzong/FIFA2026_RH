# Football 门户 · 自主升级日志

格式：`时间 | 项 | 状态(done/skip/needs_review) | 备注`

- 2026-06-13 夜 | 初始化 | done | design-review 完成 F1-F6 并部署上线；cron fe8d7f3d(:08/:38) 启动自主循环；数据守护 6h 运行中。
- 2026-06-14 05:58 | A1 全局 :focus-visible 环 | done | index.html 内联，2px var(--accent) 键盘环 + 鼠标态清爽；Tab 实测 matches:focus-visible #B8472D；0 console error；375 无横滚回归；已部署线上验证。
- 2026-06-14 06:55 | A2 tab 语义 + F6 收尾 | done | 桌面 nav-links + 移动 tabbar 加 role=tablist/tab + aria-selected(随激活切换实测通过) + 唯一 id；移动 tab 内联 minHeight 42→44 收尾 F6；0 console error；已部署线上确认。aria-controls/tabpanel + 方向键 roving 留作 A2b 后续。
- 2026-06-14 06:00 战况 | skip | martj42 canonical 仍 4 场(6/11-12)，6/13 四场赛果未入 feed(滞后)；web 源对 6/13 比分不一致/未终场，按 fail-loud 纪律不手填未确认赛果，待 daemon 自动并入。
- 2026-06-14 07:00 | A2b 布局(移动 tabbar 等宽) | done(部署延后) | repeat(6,1fr) 在 flex 下失效致 7 标签左挤右侧死区~114px；.mobile-tabbar button{flex:1 1 0;min-width:0} 后各 49px 铺满，375 单行无横滚 0 error；距上次部署仅 4min 触发节流，commit 已留，下轮随部署上线。
- 2026-06-14 07:20 | A2c aria-controls+tabpanel | done | <main>→id=wc-tabpanel role=tabpanel aria-labelledby=nav-tab-{active}(随切换)；14 tab aria-controls 全解析到该 panel；0 error；已部署。roving 拆 A2d。
- 2026-06-14 07:25 | 战况更新 6/13两场 | done | Qatar 1-1 Switzerland + Brazil 1-1 Morocco(FOX/FIFA/Yahoo 核验)经 manual-bridge 入库；4→6 场；top-pick 2/6、log-loss 1.162(小样本略逊floor)、精确比分 2/6(两平局命中modal 1-1)；Haiti-Scotland/Australia-Turkey(01:00UTC)未终场待daemon。已部署 accuracy.js v202606140700。
- 2026-06-14 07:29 | A2d tab roving + 方向键 | done(部署延后) | 活动 tab tabIndex=0 余 -1；wcTabKeyNav 处理 Arrow/Home/End 移焦+激活；实测 ArrowRight 總覽→戰報 聚焦+激活+面板 labelledby 更新+键盘环；0 error；距上次部署 4min 节流，下轮随部署上线。至此 tablist A1→A2d 完整 APG 模式。
- 2026-06-14 07:35 | A3 弹窗 a11y | done(部署延后) | FixturePopover: role=dialog/aria-modal=true/aria-labelledby=fx-modal-title/tabIndex=-1；开弹窗焦点移入、关闭归还触发元素；关闭按钮 aria-label=关闭；Escape 关闭实测 gone；0 error 无横滚。sections4.js 经核实无弹窗(Codex 行号漂移)。距上次部署 10min 节流，与 A2d 一并待下轮部署。
- 2026-06-14 07:40 | A4 可点卡片键盘 | done(部署延后) | sections7 grp-card → role=button tabIndex=0 aria-label onKeyDown(Enter/Space)→onOpen；实测 Tab→Enter 开弹窗+焦点入弹窗+环显示；0 error。sections4 clickable 实为原生 select/button 已可达，无需改。与 A2d/A3 同批待部署。
- 2026-06-14 07:54 | 部署 A2d+A3+A4 | done | 节流清除(29min)，一并上线；线上确认 sections1 wcTabKeyNav×3、sections7 role=dialog/button×2。
- 2026-06-14 08:00 | A5 晋级树横滑提示 | done(部署延后) | bracket 早已在 .bkt-scroll(overflowX:auto) 内，375 page 不横滚(body clip)且内部 scrollW1040>317 可滑；两处加 .bkt-hint"←横向滑动→"仅≤880px 显示，实测 375 显/1280 隐、0 error。下轮随部署。
- 2026-06-14 08:02 | P1 Arial 归一 | done(部署延后) | 排查发现源码无 Arial 字面量(仅 favicon SVG 合理回退)；Arial 来自浏览器对 <button>/<svg> 的 UA 默认字体(不继承页面字体)。修=button,input,select,textarea{font-family:inherit}+svg{font-family:var(--sans)}；实测渲染为 Arial 的元素 6→0、brand+svg 转 --sans、0 error 无横滚。距上次部署<25min 节流，下轮部署。
- 2026-06-14 08:50 | P2批1 --on-brand token | done(部署延后) | 调查:被标 #fff 多为品牌色上正确白(--ink-inverted 会暗色翻黑出错)。新增 --on-brand(双主题#FFF)迁 sections1×5 color:#fff;实测 token=#FFFFFF 白字保留 P1Arial仍0 0error无横滚。sections3 横幅白留 P2b。
