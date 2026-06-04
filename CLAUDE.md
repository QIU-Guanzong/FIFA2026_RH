# Football — 世界杯比分概率预测（项目级 CLAUDE.md）

> 全局规范见 `~/.claude/CLAUDE.md`。本文件记录本项目业务细节与工作日志。

## 一句话定位

可解释的世界杯预测主干：**比分分布**优先，不做黑箱 1X2 分类器。
链路：国际赛 rating 先验 → log-linear λ → Dixon-Coles 比分矩阵 → 统一派生所有盘口 → 全赛事 Monte Carlo。

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
  纪律：不眼测排名，用 #2 的国际赛 walk-forward 量化 OOS log loss（0.9118→0.8971）才算数。
  national/train 默认 passes=4（club/synthetic 仍 passes=1）。default 模型已重训为 v2（多趟）。
  注意：跑 EloPredictor 回测时 `EloPredictor(passes=k)` 透传；CEO 数据问题选了 #6 而非 #4（#4 是数据关卡）。
  - **口径坑（advisor 抓出）**：OOS 0.8971 来自 EloPredictor（固定 goals_scale=0.0018）；但 national 部署模型用
    自适配 goals_scale=0.35/(2·sd)（多趟会放大 sd → scale 更小），是不同 λ 映射、未单独回测。改进可传递（更好评分单调更好），
    但别把 0.8971 当成部署模型的端到端准确度。要端到端为真需对齐两处 scale（1 行改动，非调参项，暂不做）。
  - 测试 48 项全绿，含无泄漏守卫（`train_max_date < date` 逐行）。
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
   实测英超三季 950 场持出：市场 0.938 < Elo先验 0.959 < MLE-DC 0.992（log loss）——模型略逊锐盘=健康。
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
   建议**先证后买**：Phase 0 用 StatsBomb 真实 XI 做天花板检验（精确首发能否改善*我们自己*的预测，非比市场），
   通过才买预测 XI。**待 CEO 决策 Phase 0 是否开工 + 是否批 ~€100–300/mo 订阅。**
6. ✅ **修 Elo 洲际通胀**（2026-06-04 完成）：多趟暖启动迭代（`EloRating(passes=)`，上趟终值作下趟先验）。
   用国际赛无泄漏回测量化：OOS log loss 0.9118→0.8971（passes 1→5），单调下降；排名 Europe 上移、
   Japan/Morocco/Ecuador 下移（Top3 不变）。national 默认 passes=4。合成"双洲际"离线测试锁定机制。
   残留通胀需洲际标签/SOS 根治（→ #6b）。
6b. ✅ **残留洲际通胀校正**（2026-06-04 完成）：`ratings/confederation.py`，数据驱动洲际归属 + 洲际间残差 offset。
   无泄漏增量 bootstrap 判定只有 OFC 稳健 → 部署只落地 OFC(−70.5)；NZ 出线 −6.4pp，其余 <0.3pp。
   东道主加成=假设项默认关闭(`--host-boost`)。**剩余后置**：分层贝叶斯收缩、东道主加成的可信验证、对齐验证/部署 λ-scale 小项。

**国际数据决策（2026-06-04，CEO 选"免费 WC token 试"）**：实际落地用 martj42 免 token 全量国际赛
（比 football-data.org WC 决赛圈覆盖广得多、且无需 token、当场可跑），已实现"免费验证国家队链路"的意图。
football-data.org WC 采集器仍在 `data/sources.py`、给 token 即用。广度数据已解决，无需再额外采购。
