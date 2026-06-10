# Football — 世界杯比分概率预测（项目级 CLAUDE.md）

> 全局规范见 `~/.claude/CLAUDE.md`。本文件记录本项目业务细节与工作日志。

## 一句话定位

可解释的世界杯预测主干：**比分分布**优先，不做黑箱 1X2 分类器。
链路：国际赛 rating 先验 → log-linear λ → Dixon-Coles 比分矩阵 → 统一派生所有盘口 → 全赛事 Monte Carlo。

## 运维 / Git 推送（2026-06-05 踩坑实录，重要）

- **GitHub 推送只走 SSH 别名 `github-new`（=QIU-Guanzong）**。remote 已设为 `git@github-new:QIU-Guanzong/FIFA2026_RH.git`。
  HTTPS + osxkeychain 凭据会失效（`gh auth status` 两账号都 X、push 报 `Device not configured`）；默认 `git@github.com` SSH 指向**已封禁的 Gavin-Yau**，勿用。别名映射：`github-new`→QIU-Guanzong、`github-gavin`→Gavin-Yau(封)、`github-elena`→ElenaGe216。
- **4h 自动升级守护进程**：`scripts/run_wc2026_upgrade_loop.sh`（start/stop_wc2026_upgrade_daemon.sh，PID 文件在 `logs/wc2026-upgrade/daemon.pid`）。每 4h 重训+刷新 `site/index.html`+commit；数据/产物写 repo 外 `~/FootballData/`。**当前已停（CEO 指示）**，重启用 start 脚本。它工作在 `codex/engineering-hardening` 分支，commit 不会自动 push（鉴权曾坏）。
  **⚠️ 重启前必须先把 `main` 合并进 `codex/engineering-hardening`**——否则它会用旧分支的 `site/index.template.html`+`refresh_wc2026_site.py` 重生成**抽象版路径图**（无球队），覆盖掉 main 上已填入"最可能球队+概率"的 R32 入口版本。
- **R32 路径图填球队**（2026-06-05）：`refresh_wc2026_site.py` 的 `_modal_positions` 给 R32 入口槽填"最可能球队+概率"（头名=argmax win_group，次名=头名外 argmax **advance**，与组卡片同规则保证不矛盾）；最佳第三槽保持多组候选、16 强后保持"胜 N"（只填入口层，下游填死=假装确定）。bracket 行高 100px（容纳每卡 5 行，避免叠压）。
- **线上页**：loop 只刷新本地 `site/index.html`，**不自动 scp**；服务器更新仍需 `bash site/deploy.sh`（走 `ssh cfd`）。线上可能滞后于本地。

## 技术栈

- Python 3.12（`.venv/`，homebrew python3.12）
- numpy / scipy / pandas / pyarrow(Parquet) / duckdb(特征层) / pytest
- 包结构 src-layout：`src/wcpredict/`，已 `pip install -e .`

## 铁律（本项目）

1. **比分矩阵是唯一真理源**：所有市场（1X2/大小球/让球/BTTS/波胆/晋级/夺冠）必须从同一个
   比分矩阵派生，禁止为单个市场单独训黑箱模型（否则相互矛盾、不可解释）。
2. **Dixon-Coles τ 符号**：τ(0,0)=1−λμρ、τ(0,1)=1+λρ、τ(1,0)=1+μρ、τ(1,1)=1−ρ、其它=1。
   改动 DC 必须先跑 `tests/test_dixon_coles.py::test_tau_signs_match_paper`。
3. **赛会概率必须联合模拟**：8 个最好第三名要跨组比较，禁止按单组各算各的。
   改动赛制必须保持自洽恒等式（Σ出线=32 / Σ夺冠=1 / 晋级单调）——见 `test_tournament.py`。
4. **合成数据≠预测准确度**：合成数据只验证机器正确性。任何"校准/胜率"结论必须基于真实数据
   + 严格 cutoff 回测（T-72h/T-24h/首发后），不许偷看 closing line 与赛后真实首发。
5. **R32 落位是已知近似**：当前按总实力重新做种，会高估强队夺冠率。接真实分组须换官方 Annex C 落位表。

## 关键决策记录

- **2026-06-04 立项 v0.1**：按 advisor 建议，本轮只做"分析主干深做+测试"，部署层（FastAPI/Docker/MLflow）后置。
  - 验证过的赛制事实：48 队/12 组/前二+8 最好第三→R32；72 组赛+32 淘汰=104 场。
  - MC 向量化：小组赛逆 CDF 抽样保留净胜球/进球；淘汰赛用预计算 p_adv（含加时+点球）伯努利抽样。
    5 万届约 3s。固定种子可复现。
  - 两条建模路径：`from_ratings`（rating 先验，国家队稀疏样本推荐，默认）与 MLE `fit`（接真实历史）。
- **2026-06-04 #1 真实数据采集器**：规范 schema（比赛/赔率两表，(date,home,away) 关联）解耦数据源与模型。
  - football-data.co.uk：免授权，赔率含 Pinnacle PS/PSC(closing)、Bet365、Avg/Max；解析与下载分离便于离线单测。
  - football-data.org：API（token 走环境变量 FOOTBALL_DATA_TOKEN），WC 赛事默认中立场。
  - 原始拉取缓存到 `data/raw/`（原始数据层）。7 项离线测试覆盖解析/归一化/校验。
  - 修了一个隐蔽 bug：阶段重要性曾用 `"FINAL" in stage` 子串匹配，会把 QUARTER_FINALS 误判为决赛 → 改成精确字典。
- **2026-06-04 #2 walk-forward 回测**：时间纪律在引擎层强制（`m.iloc[:k]`，k=严格早于的比赛数）。
  - 预测器协议极简：`fit(train)` + `predict_1x2`；未见过的队兜底为平均队(att=def=0)，不会因 KeyError 泄漏。
  - 观察：原始 MLE DC 样本外不如 Elo 先验。已排除优化器未收敛（maxiter 80/200/400 结果一致、SLSQP success）；
    最可能机制=小样本过拟合（逐队 att/def 方差大），Elo 先验自带收缩。这是"国家队稀疏样本上收缩/分层贝叶斯"的待验证假设，非已证结论。
- **2026-06-04 国家队链路验证**（CEO 选"免费验证国家队链路"）：football-data.org 需 token 且只给决赛圈，
  故改用 **martj42 全量国际赛**（免 token，1872 至今，含友谊/预选/正赛 + neutral + tournament→重要性）。
  CLI `wcpredict national`。Elo（since 默认 2006 给足 burn-in）评分 Top5=Spain/Argentina/France/Brazil/England，
  与直觉一致 → 国家队 rating 链路成立。残留洲际通胀（Japan/Colombia/Ecuador 偏高）=朴素 Elo 局限，待加洲际/SOS 调整。
  注意：参赛 48 队=评分前 48（非官方名单），分组=蛇形（非真实抽签）。
- **2026-06-04 #3 部署层**：模型仓 JSON 序列化 DC 参数（teams/attack/defence/intercept/home_adv/rho）+ metadata。
  FastAPI lifespan 启动载入 latest；/predict 走 markets.summarize_match，/tournament 跑 MC 并按 (version,sims) 缓存。
  Docker 用 colima（daemon socket 在 ~/.colima/default/docker.sock；`colima start` 后才能 build/run）。
  服务依赖已并入 pyproject 主依赖（fastapi/uvicorn/pydantic），`pip install .` 即自足。
  - **路径 bug（已修）**：config 的 DATA_DIR/ARTIFACTS_DIR 原按 `__file__` parents[2] 推算，pip 安装后指到 site-packages →
    容器挂卷失效、加载不到模型。改为支持 `WCPREDICT_DATA_DIR`/`WCPREDICT_ARTIFACTS_DIR` 环境变量，Dockerfile 里设到 /app。
  - 本机**未装 docker compose 插件**：已验证 `docker build`+`docker run -v $PWD/artifacts:/app/artifacts` 路径
    （容器成功加载真实 national 模型）；compose 文件已备好但需 `brew install docker-compose` 才能用。
  - Dockerfile 分层：requirements.txt 装依赖（缓存）→ `pip install --no-deps .` 装包（代码改动只重跑这步）。
- **2026-06-04 #6 Elo 多趟暖启动**：`EloRating(passes=N)`，每趟从空计分起但用上趟终值做各队先验。
  纪律：不眼测排名，用 #2 的国际赛 walk-forward 量化 OOS log loss 才算数。
  national/train 默认 passes=4（club/synthetic 仍 passes=1）。default 模型已重训为 v2（多趟）。
  注意：跑 EloPredictor 回测时 `EloPredictor(passes=k)` 透传；CEO 数据问题选了 #6 而非 #4（#4 是数据关卡）。
  - **口径更新（2026-06-10 D1+B1，以数据为准）**：
    - 旧 0.8971/0.9118 已作废（passes=1 或不同 min_train/refit_every）
    - 最新无泄漏 walk-forward（~19,400 场持出, passes=4, min_train=200, refit_every=50）：
      | goals_scale | log loss | ECE | 备注 |
      |---|---|---|---|
      | 固定 0.0018 | **0.9049** | 0.0213 | 最佳校准，诚实参照 |
      | 固定 0.001（近似部署） | 0.9172 | 0.0597 | 全量319队，与部署top-48分布不同 |
      | "auto"全量319队 | 0.9525 | 0.0951 | 不可比：sd=341→scale=0.00051，过平 |
    - 部署 goals_scale ≈ 0.001（"auto"在 top-48，sd≈174）；全量回测 scale=0.001≠部署 scale（不同分布）
    - 0.9049（固定0.0018）是最接近的诚实参照；部署精确端到端数字需在 top-48 子集上独立测（WC 场次稀疏）
  - 测试 98 项全绿（含无泄漏守卫 `train_max_date < date` 逐行）。
- **2026-06-04 #5 Part A 自建 shot-level xG**（CEO 选"#5 阵容/xG 层"）：`data/statsbomb.py`(开放数据采集器) +
  `xg/features.py`(几何) + `xg/model.py`(可解释逻辑回归 scipy，非 sklearn/黑箱)。CLI `wcpredict xg`。
  - **铁律：真值是进球，不是 statsbomb_xg**。模型在 WC2022 留出射门上对真实进球做校准（log loss 0.341→0.278、
    ECE 0.035），statsbomb_xg 仅二级核对（r=0.82，不对齐——它多特征+ML、在 log loss/Brier 上仍更优，符合预期）。
    诚实口径：4 特征关闭"基线→statsbomb"差距 62%；ECE 两者≈0.035 属噪声，不宣称谁更准（advisor 纠"别 headline ECE 平手"）。
  - **几何陷阱**：用**门口张角**（门柱 y=36/44、x=120 两向量夹角），非到中心连线角；逐样本手算核验
    （正对 6 码→1.176rad 宽角；贴底线→趋 0）。系数符号皆合常识：距离 −0.099、张角 +1.46、头球 −1.40。
  - **点球**：比赛内点球按常数 0.76、**不进位置拟合**（位置无关，塞进去污染系数）。
  - **点球大战坑（advisor 抓出）**：64 点球≈64 场是 tell——其中 41 个是 period 5 点球大战（转化 0.63，非比赛内 xG）。
    `parse_shots` 补抓 `period`，`shots()` 默认剔除 period 5；剔后比赛内点球 23 个，总量校准从 +5.0 收紧到 +3.0。
    核心非点球校准不受影响（点球大战本就排除出拟合）。已加测试。
  - **#5 Part B（阵容/首发）= 数据门槛**：无可靠免费的预测首发/伤停源，明确后置待 CEO 决策付费源（非遗漏）。
  - **xG 尚未并入 wc2026**：单射 xG→进攻/防守强度需广泛俱乐部样本、国家队赛会样本稀疏，本回合不整合（已在报告/README 声明）。
  - `_download` 顺手硬化：有界重试+指数退避+原子写（修一次瞬时 SSL EOF，惠及所有数据源）。测试 78 项全绿。
  - 许可：StatsBomb 开放数据公开研究须注明来源。
- **2026-06-04 #6b 残留洲际通胀校正**（CEO 连续"继续"）：`ratings/confederation.py`——洲际归属从洲际赛事名
  **数据驱动派生**（近期优先处理 Australia OFC→AFC；48 队核验 Mexico/USA 不被 Copa América 客串带偏）；
  洲际间残差 OLS 估每洲 offset。CLI：`wc2026 --no-confed-correction` / `--host-boost`。
  - **纪律（advisor）**：归属是元数据可用全历史，但 **offset 幅度只 train 估计**（部署用全历史）。统一 offset 只
    动洲际间比赛（洲内抵消），故只在洲际间子集(train≤2017/test≥2018, N=1069)量化。
  - **go/no-go + 只落地 OFC**：OOS 1X2 log loss 0.976→0.973（bootstrap CI 不含 0）；但**增量 bootstrap**
    (full vs OFC-only) 95%CI=[−0.00002,+0.00183] **含 0** → 仅 OFC（NZ 大洋洲刷分）稳健，CAF/AFC 在噪声内。
    部署只应用 OFC(全历史 −70.5)，**不对全体非洲队一刀切 +44**（era-specific）。
  - **符号教训（advisor 抓 + 实测推翻先验）**：曾据 #6 笔记臆测"AFC/CAF 仍偏高→应下调"，无泄漏实测在多趟 Elo 后
    恰相反（OFC 才过高估，CAF/AFC 微偏低）。advisor 撤回其 anchor，以测量为准。符号验证：OFC 主队洲际间跑输期望→负 offset✓。
  - **部署级验证（advisor 要求的真检验）**：champion/advance with-vs-without——NZ 出线 39%→33%(−6.4pp)，其余 48 队 <0.3pp。
    Spain 仍 ~14.6%。东道主加成=不可 OOS 验证假设项，**默认关闭**，仅敏感性(+75 Elo→美/墨/加出线 +4~7.5pp)。
  - 修了 config `HOSTS`："USA"→"United States"（原会与 martj42 队名失配静默无效）。分层贝叶斯仍后置。
  - 顺手核查：martj42 含 72 行未来 WC 占位赛程(无比分)，但 `fetch_matches` 经 validate 已丢弃（部署模型无污染，已验证）。
  - 测试 83 项全绿（+5 洲际：派生含会籍变更/offset 符号/部署只取稳健洲/洲内忽略）。

## RedFootball 交互门户（site/portal/，2026-06-07）

- **来源**：claude.ai/design 设计稿（项目 FIFA，`wcpredict.html`）的生产实现。6 tab：总览 / 赛程(104 场) /
  单场预测(任选 48 队) / 晋级树(小组热门+官方 R32 树+模型路径树) / 下注建议 / 方法&回测。
- **纯静态无运行时依赖**：JSX 预编译（`portal/src/*.jsx → portal/assets/*.js`，改 JSX 后跑 `portal/build.sh`，
  需 node）；React 18.3.1 本地 vendor（不依赖 unpkg/Babel CDN）。**部署不需要 Node。**
- **数据=真实引擎，单一真理源**：`PYTHONPATH=src python scripts/export_portal_data.py` 读 registry latest
  （须 wc2026_official）→ 5 万届 MC(seed 2026) + 缓存国际赛 CSV 重算多趟 Elo + registry 历史版本逐版重模拟做
  趋势线 + Polymarket gamma API 构建期快照 → 写 `portal/assets/engine.js`。**重训后刷新门户只跑这一个脚本。**
- **兜底架构**：engine.js 最先加载；`data.js/bracket.js/fixtures.js` 均为 `window.X = window.X || …` 设计稿
  快照兜底（engine.js 缺席页面不空白）。Polymarket 运行时 90s 轮询实时价，失败回退快照。`api.js` 预留 FastAPI
  接缝（RF_API.enabled）。
- **λ 跨语言同式**：`WC_PARAMS`（attack/defence/intercept/rho 原样导出）→ 前端 `λh=exp(intercept+att_h+def_a)`；
  已断言 4 组对阵 JS=Python λ/1X2 逐位一致。computeDC 的 ρ 默认也读 WC_PARAMS。
- **坑**：① 设计原型队表有 7 队与官方分组不符（真实含 Cape Verde/Iraq/DR Congo/Uzbekistan，且用 martj42 全名
  Czech Republic/Bosnia and Herzegovina/Ivory Coast）——engine.js 以官方 48 队为准，原型表仅兜底；
  ② Polymarket gamma API 裸 urllib 会 403，必须带浏览器 UA；③ 滚动揭示沿用设计稿守卫（默认 opacity:1，
  rAF 确认时间线活着才启用动画），别改回 opacity:0 起始——后台/截图环境会整页隐形。
- **部署**：`bash site/deploy.sh` 同时上传 index.html 与 portal/ 并验证两个 URL 200。
  线上：https://gavin.astock.top/FIFA2026/portal/ 。老展示页 hero pills 已加门户入口（index.html 与
  index.template.html 都加了——daemon 重生成不丢链接）。

## 线上展示页（已部署 2026-06-04）

- **URL**：https://gavin.astock.top/FIFA2026/ （顶层路径，不挂在 AI4Future 下；noindex，非投注建议）
- **服务器**：`ssh cfd`（47.236.141.79），nginx `root /var/www/gavin`、`server_name gavin.astock.top`、
  `try_files $uri $uri/`，故 `/FIFA2026/index.html` 直接 serve，**无需改 nginx、无需 reload**。
- **页面**：纯静态自包含 `site/index.html`（深色风格对齐既有 AI4Future 页）——夺冠 Top16 + 小组热门 +
  可解释方法论 + 研发深度 + 诚实边界。**已预渲染为静态**（无 JS 依赖，curl 可验证渲染内容）。
- **一键复部署**：`bash site/deploy.sh`（scp 到 cfd，自动验证 200）。数字刷新：重跑 `wcpredict wc2026`
  → 更新 `site/index.html` 表格 → `bash site/deploy.sh`。
- 坑：本机解析 astock.top 走本地代理(fake-IP 198.18.x.x)，curl 可达但**无头浏览器/直连不一定**；
  部署与验证都走 `ssh cfd` 直连 + curl。

## 常用命令

```bash
make test          # 83 项测试
# wcpredict xg     # 自建 shot-level xG（StatsBomb WC2022 → 对进球校准）
# wcpredict wc2026 --host-boost 75   # 东道主加成敏感性（默认关闭）
make demo          # 端到端 demo（5 万届模拟）
make demo-fit      # 走 MLE 拟合路径
```

## 待办（"挨个来"进度）

1. ✅ **真实数据采集器**（2026-06-04 完成）：`data/schema.py`(规范列) + `data/sources.py`
   （football-data.co.uk 免授权 CSV / football-data.org API）。CLI `wcpredict ingest`。
   实测英超两季：模型单场预测与 Pinnacle closing 去水位高度吻合（46.7% vs 46.9%）。
2. ✅ **walk-forward cutoff 回测框架**（2026-06-04 完成）：`backtest/`（predictors + walkforward）。
   铁律：预测第 i 场只用日期严格早于该场的比赛拟合（同日也排除），`BacktestResult.assert_leakfree()` 自检。
   模型 vs 市场（Pinnacle 赛前去水位）同集对比 + reliability/ECE。CLI `wcpredict backtest`。
   实测英超三季 950 场持出：市场 0.938 < Elo先验 0.959 < MLE-DC 0.992（log loss，无正则）——模型略逊锐盘=健康。
   **L2 正则化（B2）后**：DC l2=5 → log loss **0.9678**（ECE 0.0210），大幅改善（见 B2 记录）。
3. ✅ **FastAPI 推理服务 + Docker**（2026-06-04 完成）：`registry.py`(模型仓 本地FS+metadata JSON)、
   `service/`(FastAPI: /health /rankings /predict /tournament)、CLI `train`/`serve`、Dockerfile+compose。
   服务启动载入模型仓 latest；仓库空则落合成兜底模型。已起活服务 curl 验证（Spain 24% 等）。
4. ✅ **官方 2026 分组 + 赛制**（2026-06-04 完成）：`tournament/wc2026.py`。真实分组 A–L（48 队名 100% 对齐 martj42，
   含 Curaçao 的 ç）+ 官方 R32/淘汰赛树（73–104 场，103=三四名不模拟）。CLI `wcpredict wc2026`。
   第三名落位：不猜 Annex C 表（仅在 FIFA PDF），改执行公布的每槽 5 组约束做二部图匹配；495 组合全可解但均非唯一，
   两套合法落位对比夺冠仅差 0.11pp（已量化、加测试锁定）。夺冠 Top5 Spain15%/Argentina10%/France9%/England6%/Brazil4%。
   数据来源：Wikipedia 抽签页+knockout 页，分组另用搜索交叉验证。**严禁凭记忆改分组/赛程——必须重新核验来源。**
5. **Part A ✅ 自建 shot-level xG**（2026-06-04 完成）：StatsBomb 开放数据 → 几何特征（门口张角，手算核验）→
   可解释逻辑回归。对**真实进球**校准 log loss 0.341→0.278、ECE 0.035，关闭"基线→statsbomb"差距 62%。
   CLI `wcpredict xg`。xG 尚未并入 wc2026（需广泛俱乐部样本）。
   **Part B（阵容/首发）已调研**（2026-06-04，`docs/5B_lineup_data_sources.md`）：唯一真数据门槛=**赛前*预测* XI**
   （历史首发用在手 StatsBomb、球员强度用自家 xG、伤停免费抓取——都不必买）。市面仅 Sportmonks expected lineups
   可买（Growth €99 + add-on €159–199，WC 国家队覆盖+提前量须试用坐实）；API-Football 只给确认首发(赛前 20–40min)。
   **Phase 0 天花板检验已跑**（CEO 批准，`analysis/phase0_lineup_ceiling.py`，零成本读缓存）：
   朴素 LOO 无效（球员价值与同场 xG 机械耦合，符号随是否含 M 翻转 −0.78↔+0.82，advisor 抓的坑）；
   干净组赛→淘汰赛(不相交)测得**首发进攻强度正向显著预测淘汰赛 xG**（r≈+0.48，按队 bootstrap CI 不含 0）→ 天花板为正、首发有真信号。
   **但再排序洞见（关键）**：把首发→强度的瓶颈是**可解释*球员价值*层**，不是预测 XI 采购（预测 XI 只给名字不给价值；
   导入其评分=黑箱违铁律）；且 shots-only 太稀疏(淘汰赛 XI 仅 ~4/11 可估)、上界还混入球队整体强弱(Elo 已含)。
   **结论：下一步先*建*球员价值层（扩展 #5A，用免费稠密俱乐部赛季数据测*增量*），暂不订阅 Sportmonks。**
   `parse_lineups`+射手 player 字段已加(测试覆盖)，85 项全绿。待 CEO 决策是否批"建价值层"。
6. ✅ **修 Elo 洲际通胀**（2026-06-04 完成，口径 2026-06-10 更新）：多趟暖启动迭代（`EloRating(passes=)`，上趟终值作下趟先验）。
   用国际赛无泄漏回测量化（~19,400 场持出，passes=4，goals_scale=0.0018）：OOS log loss **0.9049**（ECE 0.0213），单调优于 passes=1；排名 Europe 上移、
   Japan/Morocco/Ecuador 下移（Top3 不变）。national 默认 passes=4。合成"双洲际"离线测试锁定机制。
   残留通胀需洲际标签/SOS 根治（→ #6b）。
6b. ✅ **残留洲际通胀校正**（2026-06-04 完成）：`ratings/confederation.py`，数据驱动洲际归属 + 洲际间残差 offset。
   无泄漏增量 bootstrap 判定只有 OFC 稳健 → 部署只落地 OFC(−70.5)；NZ 出线 −6.4pp，其余 <0.3pp。
   东道主加成=假设项默认关闭(`--host-boost`)。**剩余后置**：分层贝叶斯收缩、东道主加成的可信验证、对齐验证/部署 λ-scale 小项。

**B2 DC L2 正则化（2026-06-10 完成）**：`DixonColesModel.fit(l2=0.0)` 加 L2 惩罚（attack² + defence²），
`DCFitPredictor(l2=)` 透传，CLI `--l2`。Grid search EPL 三赛季 950 场持出（`--predictor dc`）：
  | l2 | log loss | ECE | 备注 |
  |---|---|---|---|
  | 0 | 0.9916 | 0.0416 | 基准 |
  | 1 | 0.9732 | 0.0252 | 明显改善 |
  | **5** | **0.9678** | **0.0210** | **最优（三指标全优）** |
  | 20 | 0.9787 | 0.0598 | 过正则开始退化 |
  | 80 | 1.0136 | 0.0759 | 严重退化 |
机制：DC MLE 样本量有限时 attack/defence 方差大，l2 做 MAP 收缩，改善样本外泛化。
**推荐**：`--l2 5`（`--predictor dc` 时加此旗标）；部署 national/wc2026 走 Elo 先验不受影响。
默认保留 l2=0 避免静默改变行为；已加 `test_l2_shrinks_attack_defence`+`test_l2_zero_matches_default`，100 项全绿。

**国际数据决策（2026-06-04，CEO 选"免费 WC token 试"）**：实际落地用 martj42 免 token 全量国际赛
（比 football-data.org WC 决赛圈覆盖广得多、且无需 token、当场可跑），已实现"免费验证国家队链路"的意图。
football-data.org WC 采集器仍在 `data/sources.py`、给 token 即用。广度数据已解决，无需再额外采购。
