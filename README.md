# wcpredict — 世界杯比分概率预测主干 (MVP)

可解释、可回测、可本地部署的世界杯预测系统。遵循"先做比分概率系统、不做黑箱分类器"
的主线：先预测两队进球强度与**比分分布**，再由比分矩阵**统一派生**所有市场与赛会概率。

```
国际赛 Elo rating 先验  ─┐
                         ├─→  log-linear λ ─→  Dixon-Coles 比分矩阵 ─┬─→ 1X2 / 大小球 / BTTS / 让球 / 波胆
比赛历史 (MLE 拟合) ─────┘            (τ 低比分修正)                  ├─→ 赔率去水位 + 模型/市场融合
                                                                     └─→ 世界杯全赛事 Monte Carlo → 晋级率 / 夺冠率
```

> **当前状态：分析主干已端到端跑通并测试通过（33 项）。** 部署层（FastAPI / Docker Compose /
> MLflow）按建议后置到下一轮。数据层目前用**合成数据**驱动——它验证"机器算得对"，
> 不代表预测准确度；真实校准结论需接入真实数据 + 严格 cutoff 回测后才能下。

---

## 快速开始

```bash
# 依赖已装在 .venv（Python 3.12）
./.venv/bin/python -m pytest -q                          # 跑 48 项正确性测试 (~6s)
./.venv/bin/python -m wcpredict.cli demo --sims 50000    # 合成端到端 demo (~6s)
./.venv/bin/python -m wcpredict.cli ingest --league E0 --seasons 2223,2324  # 真实数据采集+拟合
./.venv/bin/python -m wcpredict.cli backtest --league E0 --predictor dc     # 无泄漏 walk-forward 回测
./.venv/bin/python -m wcpredict.cli national                                # 国家队链路（评分前48+蛇形分组）
./.venv/bin/python -m wcpredict.cli wc2026                                  # 正式 2026 预测（官方分组+官方赛程）
./.venv/bin/python -m wcpredict.cli train --model national                  # 训练并注册模型到模型仓
./.venv/bin/python -m wcpredict.cli serve                                   # 起 FastAPI 推理服务 (/docs)
# 或安装后直接： wcpredict demo / ingest / backtest / national / wc2026 / xg / train / serve

## 本机数据目录（建议）
export WCPREDICT_DATA_DIR="$HOME/FootballData/data"
export WCPREDICT_ARTIFACTS_DIR="$HOME/FootballData/artifacts"
mkdir -p "$WCPREDICT_DATA_DIR" "$WCPREDICT_ARTIFACTS_DIR"

# 夜间连续优化：每 4 小时自动训练/重建/部署（你说的“连续高强度”）
make train-wc2026                               # 先跑一次单轮
bash scripts/run_wc2026_upgrade_loop.sh --once    # 单次完整一轮（训练+刷新+部署）
make upgrade-loop                               # 持续每4小时一轮（无后台）
make upgrade-daemon                             # 后台持续每4小时一轮（适合你睡觉时）
make stop-upgrade                               # 停止后台循环
```

可调参数（都通过环境变量）：

```
MODEL_NAME（默认 default）
TRAIN_SINCE（默认 2006-01-01）
SIMS（默认 40000）
SEED（默认 2026）
SLEEP_SECONDS（默认 14400）
SERVICE_URL（默认空）
WCPREDICT_DATA_DIR（默认 `$PWD/data`）
WCPREDICT_ARTIFACTS_DIR（默认 `$PWD/artifacts`）
```
```

**部署（#3）**：本机用 colima 作 Docker 运行时——先 `colima start`，再：

```bash
docker build -t wcpredict:0.1.0 .                                  # 已验证可构建/运行
docker run -d -p 8000:8000 -v "$PWD/artifacts:/app/artifacts" wcpredict:0.1.0
```

容器启动自动载入模型仓 latest 模型（挂 `./artifacts`）；仓库为空则落合成兜底模型。
本机已实测：容器加载真实 national 模型，`/predict` 正常出概率。
`docker-compose.yml` 也已备好（`docker compose up --build` 一键起 + 健康检查），但本机未装 compose 插件，
需先 `brew install docker-compose`；已验证的是上面的 `docker build`/`run` 路径。

`demo` 演示合成链路：合成世界落 Parquet → DuckDB 特征查询 → Elo 评分 → DC 比分模型 →
单场全盘口派生 → 赔率去水位与融合 → 5 万届世界杯模拟（夺冠 Top 10 + 自洽性校验）。
加 `--fit-dc` 改走 MLE 拟合路径（较慢），默认走 rating 先验路径。

`ingest` 在**真实数据**上跑通整条链路：从 football-data.co.uk 免授权拉取历史比赛+赔率 →
归一化到规范 schema → 落 Parquet → Elo + DC 时间加权拟合 → 单场预测并与 Pinnacle closing
去水位概率对比。（英超两季 Man City 主胜 46.7% vs 市场 46.9% —— 这是**样本内链路验证**，
证明"机器算得对、量纲对、与锐盘同量级"，**不是无泄漏的准确度结论**；后者由 `backtest` 给出。）

`backtest` 是**无泄漏 walk-forward 回测**：预测第 i 场只用日期严格早于该场的比赛拟合（同日也排除），
模型与 Pinnacle 赛前去水位概率在同一持出集上比 log loss / Brier / reliability。实测英超三季 950 场持出：

| predictor | log loss | Brier | vs 市场 |
|---|---|---|---|
| 市场 (Pinnacle 赛前) | **0.9376** | 0.5538 | 基准 |
| Elo 先验 | 0.9587 | 0.5677 | −0.021 |
| DC (MLE) | 0.9916 | 0.5852 | −0.054 |

读法：模型**略逊于锐盘**才是健康信号（若简单模型样本外击败 Pinnacle，几乎一定是泄漏）。
观察：原始 MLE DC 样本外反而不如带收缩性质的 Elo 先验。已排除优化器未收敛（SLSQP 在
maxiter=80/200/400 下结果完全一致、success=True），故这是真实的泛化差距；**最可能的机制**
是小样本下逐队 att/def 的 MLE 方差偏大（过拟合），而 Elo 先验天然带收缩——这与文档"花哨不等于
更好"一致，也是国家队稀疏样本值得上分层贝叶斯/收缩的**待验证假设**（非已证结论）。

`national` 把链路搬到**真实国家队**层面（martj42 全量国际赛，免 token）：Elo 重要性加权 +
**多趟暖启动** 评分 → DC 先验 → 单场预测 → 世界杯 Monte Carlo。实测（2006 至今）评分 Top5 =
Spain / Argentina / France / Brazil / England，与直觉/FIFA 排名一致，**证明 rating 链路在国家队
真实数据上成立**。

**洲际通胀修正（#6，已用回测量化）**：朴素 Elo 冷启动会让"弱洲际多刷分"的队虚高。改用多趟暖启动
（上一趟终值作下一趟先验，把后期跨洲际比赛信息反向传播到早期），在**无泄漏 walk-forward**（17,039
场持出国际赛）上 log loss 单调下降 **0.9118 → 0.8971**（passes 1→5；默认 `passes=4`）；排名上
Portugal/Netherlands/Germany 上移、Japan/Morocco/Ecuador 下移（Top3 不变）。残留通胀仍存（需洲际标签/SOS 根治 → #6b）。

**残留洲际通胀（#6b，数据驱动 + 无泄漏判别）**：洲际归属从洲际赛事名**数据驱动派生**（近期优先处理 Australia
OFC→AFC 等会籍变更；已在 48 支 WC2026 队上核验，Mexico/USA 不被 Copa América 客串带偏）。一个统一的洲际
offset 只影响**洲际间**比赛（洲内两队同移、抵消），故在 train≤2017/test≥2018 的**洲际间**子集（N=1069）上量化。
关键纪律：归属是元数据可用全历史，但 **offset 幅度只在 train 估计**。测得 OOS 改善（1X2 log loss 0.976→0.973，
bootstrap 95%CI 不含 0），但**增量 bootstrap**（full 相对 OFC-only）95%CI=[−0.00002,+0.00183] **含 0** →
只有 **OFC**（大洋洲孤立通胀，New Zealand 在小联盟刷分）稳健，CAF/AFC 等在噪声内。故**只落地 OFC**
（全历史估得 −70.5），不对全体非洲队"一刀切 +44"。**部署级影响**：NZ 出线 39%→33%（−6.4pp，移除真实虚高），
其余 48 队均 <0.3pp。**东道主加成**=不可 OOS 验证的假设项，默认关闭，仅作敏感性（示例 +75 Elo＝**借用 Elo 主场优势量级、非实测
host 专属效应** → 美/墨/加出线 +4~7.5pp，`--host-boost` 可调）。**符号教训**：曾据 #6 笔记臆测"AFC/CAF 仍偏高"，实测在多趟 Elo 后恰相反
（OFC 才是过高估）——以无泄漏测量为准，不以先验。

> 精确口径：该 OOS 数值出自 **Elo-prior 回测预测器**（固定 `goals_scale=0.0018`）。national 部署模型用
> 自适配 `goals_scale`，是不同的 Elo→λ 映射——更好的评分在任何单调映射下都更好，故改进可传递，但**部署
> 模型本身的端到端准确度未单独回测**，夺冠数字仍为非预测性验证。要一个端到端为真的数字，需把两处 scale 对齐。

诚实边界：参赛 48 队=我们评分前 48，非官方 2026 名单；分组=蛇形非真实抽签；R32=按实力近似。
故夺冠数字是**国家队层面的机器验证**，不是 2026 正式赛会预测（接官方分组+Annex C 即 #4）。

`wc2026` 是**正式 2026 赛会预测（#4）**：真实 Elo 评分 → **官方分组 A–L** + **官方 R32/淘汰赛树（73–104 场）**
→ Monte Carlo。数据全部来自可核验来源（Wikipedia 抽签页 + 搜索交叉验证；48 队名与 martj42 **100% 对齐**）。
夺冠 Top5 ≈ **Spain 15% / Argentina 10% / France 9% / England 6% / Brazil 4%**（48 队场地，favorite 概率自然分散）。

第三名落位说明：官方 Annex C（495 组合）仅在 FIFA 规程 PDF 内、不在公开页。本模块**不猜表**——而是严格执行
Wikipedia 公布的"每个第三名槽位接受哪 5 个组"约束，用二部图匹配求合法落位。实测 495 组合**全部可解**（Hall 通过）
但**均非唯一**；用两套不同合法落位对比，**夺冠概率最大仅差 0.11pp**（reach-R16 最大 1.55pp）→ 落位选择对头部概率
可忽略。这是"遵守公布约束"而非"猜"，且其近似程度已被**量化**。

边界：实力来自我们的 Elo 先验（非市场赔率）；无东道主加成；尚无阵容/伤停/xG 层（=#5）。这已是接真实赛制的
2026 预测，随评分迭代刷新即可。

`xg` 是**自建 shot-level xG（#5 Part A）**：StatsBomb 开放事件数据（免授权）→ 几何特征 → **可解释逻辑回归**（scipy，
非黑箱）。**真值是进球，不是 statsbomb_xg**——后者只作二级 sanity 交叉核对，模型绝不向它对齐。实测 FIFA WC 2022
（1453 射门 / 64 场 / 169 进球；**点球大战 period 5 整批剔除**，23 个比赛内点球按常数 0.76 且不进位置拟合）：

| 预测器（留出 16 场 / 382 射门，对**真实进球**校准） | log loss | Brier | ECE |
|---|---|---|---|
| 常数基线（训练集进球率） | 0.3409 | 0.1913 | — |
| **本模型（4 个可解释特征）** | **0.2783** | 0.1647 | 0.035 |
| statsbomb_xg（参照，多特征 ML，全样本可比） | 0.2395 | 0.1418 | 0.035 |

读法：4 个特征（到球门距离、**门口张角**、是否头球、是否运动战）**关闭了"基线→statsbomb"log loss 差距的 62%**；
statsbomb 在 log loss/Brier 上**仍更优**（符合预期——它用约 20 个特征+ML），本模型不向其对齐。ECE 两者皆约 0.035，
在此样本量下属噪声，**不据此宣称谁更准**。系数符号皆合常识：距离 −0.099（越远越难）、张角 +1.46（角度越大越易）、
头球 −1.40。几何（门柱在 y=36/44、x=120 的张角）经**逐样本手算核验**（正对 6 码→宽张角；贴底线→张角趋 0）。
总量校准 Σxg 43 vs 实际 40（+3，小样本）；与 statsbomb_xg 相关 r=0.82（二级）。

边界（诚实）：**本回合 xG 尚未并入 `wc2026` 主链路**——把单射 xG 聚成进攻/防守强度需要广泛俱乐部样本，国家队赛会
样本稀疏；**阵容/首发层（#5 Part B）受免费数据所限**（无可靠免费的预测首发/伤停源），单列为数据门槛待 CEO 决策付费源。

---

## 模块地图

| 模块 | 职责 | 关键点 |
|---|---|---|
| `ratings/elo.py` | 国际赛 Elo 先验 | FIFA SUM 思路：重要性加权 + 净胜球放大 + 中立场 |
| `ratings/confederation.py` | **洲际通胀校正（#6b）** | 赛事名数据驱动派生洲际；洲际间残差估 offset，部署只落地稳健洲(OFC) |
| `model/dixon_coles.py` | **比分模型（心脏）** | τ 低比分修正（符号已对论文核验）；MLE 拟合 / rating 先验两条路径 |
| `markets/derive.py` | 盘口派生 | 1X2 / 大小球 / BTTS / 让球（含四分之一盘）/ 波胆，全部从同一矩阵导出 |
| `odds/devig.py` | 赔率去水位 + 融合 | multiplicative / additive / Shin；线性 & 对数意见池融合 |
| `tournament/` | 赛制 + Monte Carlo | 向量化全赛事联合模拟，5 万届约 3s |
| `metrics/calibration.py` | 校准评估 | log loss / Brier / reliability / ECE |
| `data/schema.py` | 规范数据 schema | 比赛/赔率统一列；模型层与数据来源解耦 |
| `data/sources.py` | **真实数据采集器** | football-data.co.uk（俱乐部赛+赔率）/ martj42 国际赛（免 token，给国家队定先验）/ football-data.org（API） |
| `data/synthetic.py` | 合成数据 | 从已知 DC 参数生成，兼作流水线正确性闸门 |
| `data/statsbomb.py` | **StatsBomb 射门采集器** | 开放事件数据抽射门；剔点球大战(period 5)；带重试缓存 |
| `xg/features.py` | **xG 几何特征** | 到球门距离 + 门口张角（手算核验）；点球单列 |
| `xg/model.py` | **自建 shot-level xG** | 可解释逻辑回归（scipy）；点球按常数 0.76 不进拟合 |
| `tournament/wc2026.py` | **官方 2026 赛制** | 真实分组 + 官方 R32/淘汰赛树 + 第三名落位（495 约束匹配） |
| `backtest/` | **无泄漏 walk-forward 回测** | 时间滚动 cutoff + 模型 vs 市场；预测器协议 fit/predict |
| `registry.py` | 模型仓 | 本地 FS + metadata JSON，自增版本号 + latest 指针 |
| `service/` | **FastAPI 推理服务** | /predict /rankings /tournament /health；启动载入模型仓 |
| `features.py` | 特征层 | DuckDB 查 Parquet（缺库回退 pandas） |

---

## 哪些是真的 / 近似的 / 后置的（诚实清单）

**真实且已测试**
- Dixon-Coles τ 修正符号、比分矩阵合法性、ρ<0 抬高平局（逐项断言）
- 参数复原：从已知 att/def/ρ 生成 → MLE 拟合复原（相关性 > 0.85）
- 盘口派生内部一致性（各市场概率配分=1；让球四分之一盘半 push 恒等式）
- 去水位还原（乘法对比例水位精确还原；Shin 小水位时退化为乘法）
- 赛会自洽恒等式（逐届）：Σ出线=32、Σ八强=8、Σ夺冠=1；晋级单调嵌套；出线=头名+次名+最好第三
- 可复现（固定种子 → 完全相同结果）

**刻意做的近似（已标注偏差方向）**
- **R32 落位**：官方由 Annex C（495 种组合）决定；本 MVP 用"按总实力重新做种"近似。
  对 R16/QF 打进率基本无偏，但会**高估强队的夺冠率/深度路径**（标准种子位让强队路径最优）。
  接真实 2026 分组后须替换为官方落位表（见下）。
- **分组**：用确定性蛇形分档，非真实抽签。接真实数据时直接换成官方分组。
- **点球**：默认 50/50（单独建模，可后续按实力微调）。
- **加时**：期望进球按 30/90 线性缩放后重算比分矩阵。

**已接入（真实数据，#1 完成）**
- football-data.co.uk 采集器：免授权拉取俱乐部历史比赛+多家赔率（含 Pinnacle closing）
- martj42 国际赛采集器：免 token 全量国际赛（1872 至今），给国家队定 rating 先验（广度数据）
- football-data.org 采集器：API 主数据（需免费 token），国家队赛事默认中立场
- 实测：英超两季单场预测≈Pinnacle closing；国家队评分 Top5 与直觉一致（Spain/Argentina/France/Brazil/England）

**已接入（无泄漏回测，#2 完成）**
- walk-forward cutoff 回测引擎：预测器只用严格更早的比赛拟合，自带 `assert_leakfree()`
- 模型 vs 市场（Pinnacle 赛前去水位）同集对比 + reliability/ECE 校准
- 实测英超三季 950 场持出：模型略逊锐盘（健康），框架可区分模型优劣

**已接入（部署层，#3 完成）**
- 模型仓（`registry.py`）：本地 FS + metadata JSON，自增版本 + latest 指针
- FastAPI 推理服务（`service/`）：`/health` `/rankings` `POST /predict` `/tournament` `/docs`，启动自动载入模型
- `wcpredict train`（注册模型）/ `wcpredict serve`（起服务）；Dockerfile + docker-compose 一键起

**已接入（评分增强，#6 完成）**
- 多趟暖启动 Elo：在国际赛无泄漏 walk-forward 上 OOS log loss 0.9118→0.8971，洲际通胀显著下降
- 用合成"双洲际"场景做了确定性离线测试，锁定改进机制（非眼测）

**已接入（残留洲际通胀校正，#6b 完成）**
- 洲际归属数据驱动派生（赛事名 + 近期优先）；offset 在洲际间残差上估计，归属用全历史而 offset 幅度 train-only
- 无泄漏判别：增量 bootstrap 表明仅 OFC 稳健（CI 不含 0），CAF/AFC 等在噪声内 → 部署**只落地 OFC**（−70.5）
- 部署级验证：NZ 出线 −6.4pp（移除大洋洲孤立虚高），其余 <0.3pp；东道主加成=不可验证假设项，默认关闭仅作敏感性
- 教训：实测推翻"AFC/CAF 仍偏高"的先验（多趟 Elo 后 OFC 才是过高估）——以无泄漏测量为准

**已接入（官方赛制，#4 完成）**
- 官方 2026 分组 A–L（48 队名 100% 对齐 martj42）+ 官方 R32/淘汰赛树（73–104 场）
- 第三名落位：执行公布的每槽 5 组约束做二部图匹配；495 组合全可解、均非唯一，落位选择对夺冠仅 ±0.11pp（已量化）
- `wcpredict wc2026` 产出正式 2026 夺冠/出线概率 + 各组热门

**已接入（自建 shot-level xG，#5 Part A 完成）**
- StatsBomb 开放数据采集器 + 几何特征（门口张角，逐样本手算核验）+ 可解释逻辑回归（scipy，非黑箱）
- 在 WC2022 留出射门上**对真实进球**做校准：log loss 0.341→0.278，ECE 0.035；关闭"基线→statsbomb"差距 62%
- 真值是进球而非 statsbomb_xg（仅二级核对 r=0.82，不对齐）；点球常数 0.76、点球大战整批剔除
- 合成数据上逻辑回归参数复原 + 校准为离线测试闸门（不触网）

**后置（下一轮）**
- **#5 Part B（阵容/首发层）已调研**（`docs/5B_lineup_data_sources.md`）：唯一真数据门槛=**赛前*预测* XI**；
  历史首发(StatsBomb 在手)/球员强度(自家 xG)/伤停(免费抓取)都不必买。建议先用在手数据做天花板检验(Phase 0)，
  通过再买 Sportmonks 预测 XI(~€100–300/mo，WC 国家队覆盖须试用坐实)。待 CEO 决策 Phase 0 开工 + 订阅。
- xG→λ 整合：把单射 xG 聚成进攻/防守强度需广泛俱乐部样本，国家队赛会样本稀疏 → 暂不并入 `wc2026`
- 评分再增强（#6b 已落地 OFC 洲际校正）：剩余=分层贝叶斯收缩；SOS 细化；东道主加成的可信验证（现为假设项）
- 对齐"验证预测器=部署模型"的 λ-scale，让端到端有个回测真数字 — 小项

---

## 接真实数据的插点

当前 `data/synthetic.py` 产出的 `history` DataFrame 列约定即为真实采集器应对齐的 schema：

| 列 | 含义 | 真实来源建议 |
|---|---|---|
| `home/away` | 对阵 | football-data.org / API-Football（赛程、球队） |
| `home_goals/away_goals` | 比分 | 同上 |
| `neutral` | 是否中立场 | 赛程元数据 |
| `days_ago` | 距今天数（时间衰减用） | 由比赛日期算 |
| `importance` | 比赛重要性权重 | 自定义（世界杯正赛 QF 前 50、之后 60 的思路） |

- **历史赔率回测**：football-data.co.uk（可下载历史结果+赔率）
- **带时间戳盘口快照**：The Odds API（历史端点按时间戳取快照，5 分钟粒度）
- **事件级/xG 训练样本**：StatsBomb Open Data（含 2022 世界杯 + 360 freeze-frame）

替换 R32 落位：在 `tournament/format.py` 留有"标准做种"实现，接真实赛制时新增一个
Annex C 落位策略（输入"8 个晋级第三名来自哪些组" → 输出 R32 对阵）替换 `bracket_seed_order`
那段即可，其余引擎不变。

---

## 许可证与授权红线

- 使用 **StatsBomb Open Data** 做公开研究须注明数据来源。
- 面向公众分发的商业产品如触及**世界杯官方 betting data**：2026 年 FIFA 已将其全球分发权
  授予 **Stats Perform**，授权边界必须在立项时单独核验，不能默认公共源足够。
- **Pinnacle API** 自 2025-07-23 起不再向普通公众开放（仅特定商业/学术合作）。

---

## 路线图（对应文档三阶段）

1. **MVP（本轮，已完成分析主干）**：rating 先验 + Dixon-Coles + 去水位校准 + 全赛会 Monte Carlo
2. **增强版**：StatsBomb 自建 shot-level xG（**Part A 完成，对进球校准**）；预计首发→阵容影响分（Part B，数据门槛后置）；MLE 拟合接真实历史
3. **生产化版**：FastAPI + Docker Compose 部署；严格 cutoff 回测；版本管理；授权核验

对世界杯这种任务，最值钱的不是花哨，而是**概率校准、信息截止纪律、与市场相比的长期边际优势**。
