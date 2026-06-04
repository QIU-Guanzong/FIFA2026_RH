# #5 Part B 数据源调研 — 阵容/首发层（给 CEO 的决策备忘）

> 2026-06-04。对应路线图 #5 Part B（之前标注"数据门槛后置"）。本文不写代码，只调研 + 给决策。
> 结论先行，细节与来源在后。**所有价格/覆盖随时间变，下方均附来源链接，签约前以官方报价为准。**

## 0. 一句话结论

**唯一真正买不到/要么买要么自建的，是"赛前*预测*首发"（forward predicted XI）。** 历史真实首发、
球员→强度估值、伤停历史，**都已免费在手或可免费抓取**。因此建议**先用在手免费数据做"天花板检验"**
（精确首发到底能否改善*我们自己*的预测），通过后再花钱买预测首发——而不是先付费。

> **更新（Phase 0 已执行，见 §4.5）**：天花板检验**已跑完**——去伪后**首发信息确有正向真信号**
> （干净测试 r≈+0.48，CI 不含 0），但**真正瓶颈是"可解释的*球员价值*层"，不是"预测 XI 采购"**
> （预测 XI 只给名字不给价值）。**结论再排序：下一步先*建*球员价值层（免费稠密俱乐部数据），暂不订阅。**

## 1. 需求拆解：项目三道 cutoff ↔ 数据时延（这是选型的脊柱）

项目的校准纪律要求在 **T-72h / T-24h / 首发后** 三个时点出预测。各时点对"首发数据"的要求完全不同：

| Cutoff | 需要什么 | 谁能提供 | 边际价值 |
|---|---|---|---|
| **T-72h / T-24h** | **预测** XI（赛前数天/小时）+ 伤停 | 仅 **Sportmonks expected lineups**（分析师驱动）可买；否则自建 | **最大**——市场此时首发信息少 |
| **首发后**（closing 前） | **确认** XI（赛前 20–75 分钟） | API-Football(20–40min) / Sportmonks(60–75min) | **最小**——市场已把首发计入 closing |

**价值反转（关键、易被误读）**：首发后那一档虽然信息最准，但市场也最准、留给我们的边际最小；
T-24h 那一档我们能抢到的边际最大，但我们的预测 XI 也最*噪*。**所以"确认首发"便宜但价值低，
"预测首发"贵但价值高**——这正是付费与否的核心权衡。

## 2. 关键认知：真正要"买"的只有一样

把需求拆开看，三件事里有两件**已经免费在手**：

| 拼图 | 来源 | 状态 |
|---|---|---|
| 历史真实首发 + 事件（做回测） | **StatsBomb 开放数据（#5A 已集成）**，WC2022 真实 XI + 射门级事件 | ✅ **在手免费** |
| 球员 → 强度转换 | **自家 #5A xG/贡献模型**（保持可解释、在内部，不外购市值） | ✅ **可自建** |
| 伤停历史 | Transfermarkt（`worldfootballR` 抓取，免费）/ API-Football injuries（免费档） | ✅ 免费可取 |
| **赛前*预测* XI（前瞻）** | 市面仅 Sportmonks expected lineups 可买；或自建代理 | ⚠️ **唯一数据门槛** |

> 含义：不必为"历史首发""球员估值"付费——StatsBomb + 自家 xG 已够跑 Phase 0。真正的开销
> 收敛到**一件事**：赛前前瞻预测 XI。

## 3. 供应商对比

| 源 | 预测 XI(赛前前瞻) | 确认 XI | 伤停 | WC2026 覆盖 | 价格 | 对本项目 |
|---|---|---|---|---|---|---|
| **StatsBomb 开放**（在手） | ✗ | 仅历史 | 仅历史 | 历史(WC2022) | 免费(须注明来源) | **Phase 0 历史天花板检验的底座** |
| **API-Football** (api-sports.io) | ✗（只确认） | ✓ 赛前 20–40min | ✓（免费档即有） | ✓ `league=1, season=2026`，已上线 | 免费(100 req/日) / Pro / Ultra | 首发后 cutoff + 伤停 + going-forward 近免费 |
| **Sportmonks** | ✓ **expected**(分析师监控新闻/发布会/伤报) | ✓ 赛前 60–75min | ✓ | ✓ `season 26618 / league 732`，宣称含 expected*(待验)* | Growth €99/mo **+ Expected Lineups add-on €199/mo(年付€159)+VAT**；另有 WC 套餐 €69(WC Special)/€129(WC All-In 含 xG) | **唯一可买的前瞻预测 XI** |
| **Opta / Stats Perform** | ✓（企业级） | ✓ | ✓ | ✓（持官方数据权） | 定制报价，第三方估 **$500–1000+/mo 起**，长期合同 | 商业级/官方权，对"分析主干"**过重** |
| **Sportradar** | ✓（企业级） | ✓ | ✓ | ✓（持官方权） | 长期合同、昂贵；有 30 天开发者试用 | 同上，适合媒体/博彩运营商 |

**两条必须在试用中亲自验证的事（决定 Phase 1 成立与否）**：
1. **Sportmonks expected lineups 是否真覆盖 WC *国家队***——其产品页以俱乐部联赛为主、未明确国家队；
   WC 博客称"含 expected"但未坐实。**很可能国家队是另一套编辑产品**。
2. **提前量**——expected XI 到底赛前多久落地？官网未写。若只在赛前 1–2 小时出，则与"确认首发"几乎无异，
   T-24h 用不上。（确认首发是 60–75min；expected 须更早才有意义。）
   若 (1)(2) 任一不成立 → Phase 1 退回"自建预测 XI 代理"（从伤停/轮换/近期出场推断首发）。

## 4. 建议：两阶段，**先证后买**

### Phase 0 — 天花板检验（≈0 成本，纯用在手数据，可立即做）
用 **StatsBomb WC2022 真实 XI + 自家 #5A xG/贡献**，构建 `lineup → λ 调整` 层，在历史上量化：

> **"*精确*首发信息，能否改善*我们自己*的 lineup-blind 预测？"**——以 log loss/校准对比**我们的无首发基线**，
> **不是**与市场比。

- **这是天花板**：用的是事后已知的*真实*首发（完美信息），衡量首发信息对我们数字的**最大可能**增益。
- **诚实口径（重要）**：Phase 0 **不**直接验证 Phase 1。Phase 1 的真问题是"**带噪声的*预测* XI** 能否保住
  这部分增益"，这只能用付费源或自建代理回答。**Phase 0 弱 → 直接否掉 Phase 1（不值得买）；
  Phase 0 强 → 仅说明"有上限可争"，不保证噪声预测能兑现。** 别把 Phase 0 读成 Phase 1 的通行证。

### Phase 1 — 仅当 Phase 0 显示显著增益才付费
1. 先开 Sportmonks **14 天免费试用**，验证 §3 的两件事（WC 国家队覆盖 + 提前量）。
2. 验证通过 → 订阅解锁前瞻预测 XI：**Growth €99 + Expected Lineups add-on €159–199/mo**
   （或先问 sales：€69/€129 的 WC 套餐是否含 expected lineups，若含则更省）。预算量级 **~€100–300/mo**。
3. 验证不通过 → 退回**自建预测 XI 代理**（用免费伤停 + 近期出场/轮换数据推断首发），成本=工时非订阅费。

### 不建议
Opta / Stats Perform / Sportradar 企业级：$500–1000+/mo 起、定制合同、官方数据权——
除非要做**商业化规模分发**，否则对一个"可解释分析主干"过重。FIFA 官方 betting data 权在 Stats Perform，
仅在商业化触及官方盘口数据时才需单独授权。

## 4.5 Phase 0 已执行（2026-06-04）：结果 + **路线再排序**

零成本跑完天花板检验（`analysis/phase0_lineup_ceiling.py`，纯用在手 StatsBomb WC2022 缓存）。三点：

1. **朴素"留一场"测试无效（伪信号）**：球员价值估计量与同场 xG 目标机械耦合——是否把当场算进球员价值，
   斜率就在 **−0.78 ↔ +0.82** 之间翻转。诊断后弃用。
2. **干净测试（组赛率→淘汰赛，估计/检验集*不相交*=无耦合）**：首发进攻强度**正向且显著**预测淘汰赛 xG，
   **slope +0.42 / Pearson r +0.48 / R² 0.23 / 按队聚类 bootstrap 95%CI [+0.15, +1.03]（不含 0）**。
   → **天花板为正：精确首发信息确实携带真信号。**（≠"首发无用"——它有用。）
3. **但两条硬约束决定下一步不是买预测 XI**：
   - (a) 这个上界**混入了球队整体强弱**（已被我们的 Elo 捕获）；剔除球队基线后的*增量*首发价值**未能单独测**
     （淘汰赛每队场次太少，无法队内去均值）。
   - (b) 把首发→强度，需要一个**可解释的球员价值模型**；而 shots-only 价值**太稀疏**（淘汰赛每套 XI 仅 ~4/11 人可估、
     组赛率仅 2–3 场），不足以支撑。

**再排序洞见（本次最关键的决策结论）**：把*任何* XI（无论已知还是预测）转成强度增量，**前置依赖是一个可解释的
球员价值层**——这才是**约束瓶颈**。**预测 XI（Sportmonks 的买点）只给名字、不给价值**；而直接导入它家的球员评分
=黑箱，违背项目可解释铁律。**所以预测 XI 不是该先买的东西**；先决条件是球员价值层（要*建*，需稠密事件/广俱乐部样本），
这正是我们 #5A 自建 xG 已开的方向、也是之前就标注的数据关卡。

> 一句话：**信号是真的（值得追），但提取它要先*建*球员价值层，不是先*买*预测 XI。** Phase 1（订阅）推迟到
> 价值层建好、并在稠密数据上证明*增量*首发价值之后再议。"暂时测不到增量" ≠ "首发无用"——边际恰恰在 T-24h，
> 那也正是目前测不到的地方。

## 5. 授权红线（签约前必看）
- **StatsBomb 开放数据**：公开研究须注明来源（项目已遵守）。
- **Sportmonks / API-Football**：plan 内含标准 SaaS 商业使用许可，适合分析/产品；非官方博彩数据权。
- **FIFA 官方 betting data**：2026 全球分发权在 **Stats Perform**；仅商业化大规模分发官方盘口数据时才需。

## 6. 待 CEO 决策（Phase 0 已完成，据结果更新）

1. ✅ **Phase 0 已跑完**（零成本）：去伪后天花板为正（首发有真信号），但*增量*价值暂不可测，**瓶颈=球员价值层**。
2. **建议下一步：批准*建*可解释球员价值层**——扩展 #5A 从"射门级 xG"到"球员贡献/可得性"，用 StatsBomb
   **免费稠密俱乐部赛季**数据（非国家队稀疏样本），在稠密数据上测"剔除球队基线后的*增量*首发价值"。
   真正瓶颈、零订阅成本、保持可解释、在内部。
3. **暂不订阅 Sportmonks 预测 XI**（只给名字不给价值；导入其评分=黑箱违背铁律）。仅当 (2) 的价值层在稠密数据上
   显示*增量*提升后，再议 ~€100–300/mo 订阅以驱动 going-forward 实时预测（届时仍须试用坐实 WC 国家队覆盖+提前量）。
4. 伤停/出场（免费：API-Football 免费档 / Transfermarkt 抓取）可随价值层一并接入，零订阅成本。

## 来源
- Sportmonks 价格：<https://www.sportmonks.com/football-api/plans-pricing/>
- Sportmonks Expected Lineups（add-on €199/€159，Growth/Pro）：<https://www.sportmonks.com/football-api/expected-lineups-api/>
- Sportmonks WC2026 API（season 26618，WC 套餐 €69/€129）：<https://www.sportmonks.com/football-api/world-cup-api/> · <https://www.sportmonks.com/blogs/world-cup-2026-api-guide-coverage-endpoints-data-types/>
- API-Football 价格/覆盖：<https://www.api-football.com/pricing> · <https://www.api-football.com/coverage> · WC2026 指南 <https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports>
- Stats Perform 价格/授权：<https://www.statsperform.com/stats-perform-faqs-pricing-and-licensing/> · <https://www.statsperform.com/resource/how-much-does-sport-data-cost/>
- Sportradar：<https://sportradar.com/media-tech/data-content/sports-data-api/> · <https://developer.sportradar.com/>
- Transfermarkt（伤停/市值，免费抓取）：`worldfootballR` <https://jaseziv.github.io/worldfootballR/articles/extract-transfermarkt-data.html>
