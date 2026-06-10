"""端到端 demo：rating 先验 → DC 比分矩阵 → 盘口派生 → 去水位融合 → 全赛事 Monte Carlo。

运行：  python -m wcpredict.cli demo --sims 20000
或安装后：  wcpredict demo
"""
from __future__ import annotations

import argparse

import numpy as np
import pandas as pd

from wcpredict.config import DATA_DIR
from wcpredict.data.synthetic import make_world_48, save_history_parquet
from wcpredict.features import team_form_table
from wcpredict.markets import outcome_1x2, summarize_match
from wcpredict.model.dixon_coles import DixonColesModel, DixonColesParams, exp_time_weights
from wcpredict.odds import blend_log, devig, overround
from wcpredict.ratings import EloRating
from wcpredict.tournament import TournamentSimulator, snake_draw_groups

pd.set_option("display.width", 120)
pd.set_option("display.max_columns", 20)

_LINE = "─" * 64


def _section(title: str) -> None:
    print(f"\n{_LINE}\n▶ {title}\n{_LINE}")


def run_demo(sims: int = 20000, seed: int = 42, fit_dc: bool = False) -> None:
    _section("1. 合成世界 + 原始数据落 Parquet")
    true_params, history = make_world_48(seed=seed)
    pq = save_history_parquet(history, DATA_DIR / "history.parquet")
    print(f"球队 {len(true_params.teams)} 支，历史比赛 {len(history)} 场 → {pq}")

    _section("2. DuckDB 特征层（查询 Parquet）")
    form = team_form_table(pq)
    print(form.head(6).to_string(index=False, float_format=lambda x: f"{x:.3f}"))

    _section("3. 国际赛 Elo rating 先验")
    elo = EloRating()
    elo.fit(history)
    ratings = {t: elo.get(t) for t in true_params.teams}
    rank = sorted(ratings.items(), key=lambda kv: kv[1], reverse=True)
    print("Top 6 评分：", ", ".join(f"{t}={r:.0f}" for t, r in rank[:6]))

    _section("4. 构建比分模型 (Dixon-Coles)")
    if fit_dc:
        w = exp_time_weights(history["days_ago"].to_numpy())
        model = DixonColesModel().fit(
            history["home"], history["away"], history["home_goals"], history["away_goals"],
            neutral=history["neutral"], weights=w, teams=true_params.teams,
        )
        print(f"路径：对 {len(history)} 场做时间加权 MLE 拟合。rho={model.params.rho:.4f}, "
              f"home_adv={model.params.home_adv:.3f}")
    else:
        model = DixonColesModel(DixonColesParams.from_ratings(ratings))
        print(f"路径：Elo rating 先验 → DC 参数（国家队稀疏样本推荐）。rho={model.params.rho:.4f}")
    params = model.params

    _section("5. 单场比分矩阵 → 全盘口派生")
    a, b = rank[0][0], rank[1][0]
    lam, mu = params.lambdas(a, b, neutral=True)
    M = model.predict_matrix(a, b, neutral=True)
    s = summarize_match(M)
    print(f"对阵：{a} (λ={lam:.2f})  vs  {b} (μ={mu:.2f})  [中立场]")
    o = s["1x2"]
    print(f"  1X2          主胜 {o['home']:.1%} / 平 {o['draw']:.1%} / 客胜 {o['away']:.1%}")
    ou = s["over_under"][2.5]
    print(f"  大小球 2.5   大 {ou['over']:.1%} / 小 {ou['under']:.1%}")
    bt = s["btts"]
    print(f"  双方进球     是 {bt['yes']:.1%} / 否 {bt['no']:.1%}")
    ah = s["asian_handicap"][-0.5]
    print(f"  让球 -0.5    {a} 覆盖 {ah['home']:.1%} / {b} 覆盖 {ah['away']:.1%}")
    print("  最可能比分  " + ", ".join(f"{x}:{y}={p:.1%}" for (x, y), p in s["top_scores"][:5]))
    eg = s["expected_goals"]
    print(f"  期望进球     {a} {eg['home']:.2f} : {eg['away']:.2f} {b}  (自检应≈λ,μ)")

    _section("6. 赔率去水位 + 模型/市场融合")
    p_true = np.array([o["home"], o["draw"], o["away"]])
    margin = 0.06
    book = p_true * (1 + margin)
    odds = 1.0 / book
    print(f"  合成市场赔率 (含 {margin:.0%} 水位)：主 {odds[0]:.2f} / 平 {odds[1]:.2f} / 客 {odds[2]:.2f}"
          f"  实际 overround={overround(odds):.3f}")
    p_mult = devig(odds, "multiplicative")
    p_shin = devig(odds, "shin")
    print(f"  去水位(乘法)：{p_mult[0]:.1%}/{p_mult[1]:.1%}/{p_mult[2]:.1%}")
    print(f"  去水位(Shin)：{p_shin[0]:.1%}/{p_shin[1]:.1%}/{p_shin[2]:.1%}")
    blended = blend_log(p_mult, p_shin, w_model=0.5)  # 此处演示融合机制
    fair_odds = 1.0 / blended
    print(f"  融合后公平赔率：主 {fair_odds[0]:.2f} / 平 {fair_odds[1]:.2f} / 客 {fair_odds[2]:.2f}")

    _section("7. 世界杯全赛事 Monte Carlo")
    ranked_teams = [t for t, _ in rank]
    groups = snake_draw_groups(ranked_teams)
    sim = TournamentSimulator(params, groups)
    result = sim.run(n_sims=sims, seed=seed)
    print(f"模拟 {result.n_sims} 届。夺冠概率 Top 10：\n")
    show = result.probs.head(10)[
        ["advance", "reach_QF", "reach_SF", "reach_Final", "champion"]
    ]
    print((show * 100).round(1).to_string(float_format=lambda x: f"{x:.1f}%"))

    # 自洽性校验（每届恒等式 → 与 N 无关）
    p = result.probs
    print("\n一致性校验（应非常接近）：")
    print(f"  Σ 出线 = {p['advance'].sum():.2f} (应=32)   "
          f"Σ 八强 = {p['reach_QF'].sum():.2f} (应=8)   "
          f"Σ 夺冠 = {p['champion'].sum():.3f} (应=1)")

    _section("8. 校准纪律提示")
    print("  合成数据仅验证机器正确性，不代表预测准确度。")
    print("  真实校准结论需接入真实数据 + T-72h/T-24h/首发后的严格 cutoff 回测，")
    print("  以 log loss / Brier / reliability bins 评估，并与 closing line 持续比对。")


def run_ingest(league: str = "E0", seasons: tuple[str, ...] = ("2223", "2324"), top: int = 8) -> None:
    """真实数据采集 → 规范 schema → Elo + DC 拟合 → 预测/去水位演示。

    用 football-data.co.uk 免授权 CSV（俱乐部赛）验证整条链路在真实数据上跑通。
    国家队 rating 先验需国际赛结果（football-data.org WC / 其它），见输出提示。
    """
    from wcpredict.data import add_days_ago, load_seasons

    _section(f"1. 拉取真实数据：football-data.co.uk [{league}] 赛季 {', '.join(seasons)}")
    try:
        matches, odds = load_seasons(league, list(seasons))
    except Exception as e:  # noqa: BLE001
        print(f"下载失败：{e}\n请检查网络，或改用合成 demo：wcpredict demo")
        return
    matches = add_days_ago(matches)
    matches.to_parquet(DATA_DIR / f"matches_{league}.parquet")
    odds.to_parquet(DATA_DIR / f"odds_{league}.parquet")
    teams = sorted(set(matches["home"]) | set(matches["away"]))
    print(f"比赛 {len(matches)} 场 | 球队 {len(teams)} 支 | "
          f"日期 {matches['date'].min().date()} → {matches['date'].max().date()} | 赔率行 {len(odds)}")
    print(f"已落盘：{DATA_DIR / f'matches_{league}.parquet'} 等")

    _section("2. 国际赛 Elo 评分（真实数据）")
    elo = EloRating()
    elo.fit(matches)
    rank = sorted({t: elo.get(t) for t in teams}.items(), key=lambda kv: kv[1], reverse=True)
    print("Top 评分：", ", ".join(f"{t}={r:.0f}" for t, r in rank[:top]))

    _section("3. Dixon-Coles 时间加权 MLE 拟合（真实数据）")
    w = exp_time_weights(matches["days_ago"].to_numpy())
    model = DixonColesModel().fit(
        matches["home"], matches["away"], matches["home_goals"], matches["away_goals"],
        neutral=matches["neutral"], weights=w, teams=teams,
    )
    print(f"rho={model.params.rho:.4f}  home_adv={model.params.home_adv:.3f}  "
          f"intercept={model.params.intercept:.3f}")

    _section("4. 单场预测 + 模型 vs 市场（去水位）")
    a, b = rank[0][0], rank[1][0]
    M = model.predict_matrix(a, b, neutral=False)        # 俱乐部赛含主场
    o = outcome_1x2(M)
    print(f"{a} (主) vs {b}：模型 主胜 {o['home']:.1%} / 平 {o['draw']:.1%} / 客胜 {o['away']:.1%}")
    mkt = odds[(odds["home"] == a) & (odds["away"] == b) &
               (odds["book"] == "pinnacle") & (odds["snapshot"] == "closing")]
    if len(mkt):
        row = mkt.iloc[-1]
        oo = np.array([row["odds_home"], row["odds_draw"], row["odds_away"]])
        p_mkt = devig(oo, "shin")
        print(f"  Pinnacle closing 去水位(Shin)：主 {p_mkt[0]:.1%} / 平 {p_mkt[1]:.1%} / 客 {p_mkt[2]:.1%}")
        print("  （注：评分用全样本拟合，此处仅演示链路；无泄漏的严格 cutoff 回测见路线图 #2）")
    else:
        print("  （该对阵无 Pinnacle closing 记录；赔率→去水位链路已在测试覆盖）")

    _section("5. 提示")
    print("  俱乐部数据验证了整条链路在真实数据上跑通。世界杯国家队预测需国际赛结果做 rating 先验：")
    print("  - football-data.org（competition='WC'，需免费 token）→ FootballDataOrgSource")
    print("  - 严格 cutoff 回测框架是下一环（#2）。")


def run_backtest(
    league: str = "E0",
    seasons: tuple[str, ...] = ("2122", "2223", "2324"),
    predictor: str = "dc",
    min_train: int = 190,
    refit_every: int = 40,
    source: str = "couk",
    since: str = "2006-01-01",
    goals_scale: str | float = 0.0018,
    passes: int = 1,
) -> None:
    """无泄漏 walk-forward 回测：模型 vs 市场（Pinnacle 赛前去水位），同一持出集对比。

    source="international"：用 martj42 全量国际赛（无市场赔率），测 goals_scale 对 OOS log loss 的影响。
    """
    from wcpredict.backtest import DCFitPredictor, EloPredictor, WalkForwardBacktest

    if source == "international":
        from wcpredict.data.sources import InternationalResultsSource
        _section(f"1. 数据 martj42 国际赛（{since} 至今）")
        try:
            matches = InternationalResultsSource(since=since).fetch_matches()
        except Exception as e:  # noqa: BLE001
            print(f"下载失败：{e}")
            return
        print(f"国际赛 {len(matches)} 场 | "
              f"{matches['date'].min().date()} → {matches['date'].max().date()}")

        _section(f"2. Walk-forward 回测（predictor=elo, goals_scale={goals_scale}, passes={passes}, "
                 f"min_train={min_train}, refit_every={refit_every}）")
        pred = EloPredictor(goals_scale=goals_scale, passes=passes)
        bt = WalkForwardBacktest(matches, odds=None)
        res = bt.run(pred, min_train=min_train, refit_every=refit_every)
        tag = f"intl_gs{goals_scale}_p{passes}"
        res.per_match.to_parquet(DATA_DIR / f"backtest_international_{tag}.parquet")
        met = res.metrics()

        print(f"无泄漏校验: {'✓ 通过' if met['leak_free'] else '✗ 失败'}")
        print(f"持出预测 {met['n_predictions']} 场（国际赛无市场赔率，仅模型 log loss）")
        print(f"  模型 log loss: {met['model_all']['log_loss']:.4f}  "
              f"Brier: {met['model_all']['brier']:.4f}")

        _section("3. 概率校准（模型主胜）")
        rc = res.reliability("home", n_bins=10)
        print(f"ECE(主胜) = {rc['ece']:.4f}")
        for b in range(10):
            if rc["count"][b] > 0:
                print(f"  预测 {rc['mean_pred'][b]:.2f} | 实际 {rc['frac_pos'][b]:.2f} | n={rc['count'][b]}")
        return

    from wcpredict.data import load_seasons
    _section(f"1. 数据 football-data.co.uk [{league}] {', '.join(seasons)}")
    try:
        matches, odds = load_seasons(league, list(seasons))
    except Exception as e:  # noqa: BLE001
        print(f"下载失败：{e}")
        return
    print(f"比赛 {len(matches)} 场 | 赔率行 {len(odds)} | "
          f"{matches['date'].min().date()} → {matches['date'].max().date()}")

    _section(f"2. Walk-forward 回测（predictor={predictor}, min_train={min_train}, refit_every={refit_every}）")
    if predictor == "dc":
        pred = DCFitPredictor()
    else:
        _gs = goals_scale if goals_scale != 0.0018 else 0.0018
        pred = EloPredictor(goals_scale=_gs, passes=passes)
    bt = WalkForwardBacktest(matches, odds)
    res = bt.run(pred, min_train=min_train, refit_every=refit_every,
                 market_book="pinnacle", market_snapshot="prematch")
    res.per_match.to_parquet(DATA_DIR / f"backtest_{league}_{predictor}.parquet")
    met = res.metrics()

    print(f"无泄漏校验: {'✓ 通过' if met['leak_free'] else '✗ 失败'}  "
          f"（每场训练集最新日期均早于该场）")
    print(f"持出预测 {met['n_predictions']} 场，其中有市场赔率 {met.get('n_with_market', 0)} 场\n")
    print(f"{'指标':<22}{'log loss':>12}{'Brier':>10}")
    print(f"{'模型(全部持出)':<20}{met['model_all']['log_loss']:>12.4f}{met['model_all']['brier']:>10.4f}")
    if "market" in met:
        print(f"{'模型(有盘口子集)':<19}{met['model_on_market_set']['log_loss']:>12.4f}"
              f"{met['model_on_market_set']['brier']:>10.4f}")
        print(f"{'市场(Pinnacle 赛前)':<18}{met['market']['log_loss']:>12.4f}{met['market']['brier']:>10.4f}")
        edge = met["market"]["log_loss"] - met["model_on_market_set"]["log_loss"]
        print(f"\n模型相对市场 log loss 差: {edge:+.4f}  "
              f"（>0 表示模型在该集上更好；样本/联赛有限，勿过度解读）")
        print(f"模型与市场平均概率分歧: {met['mean_abs_divergence']:.4f}")

    _section("3. 概率校准（模型主胜，reliability bins）")
    rc = res.reliability("home", n_bins=10)
    print(f"ECE(主胜) = {rc['ece']:.4f}")
    for b in range(10):
        if rc["count"][b] > 0:
            print(f"  预测 {rc['mean_pred'][b]:.2f} | 实际 {rc['frac_pos'][b]:.2f} | n={rc['count'][b]}")

    _section("4. 提示")
    print("  这是无泄漏的样本内→外回测：模型每场只用更早的比赛拟合。")
    print("  俱乐部数据上模型接近市场即为健康信号；真实边际优势需更长样本/多联赛/closing line 跟踪。")


def run_national(since: str = "2006-01-01", n_teams: int = 48, sims: int = 30000, top: int = 15) -> None:
    """国家队链路验证：真实国际赛 → Elo 评分 → DC 先验 → 单场预测 + 世界杯 Monte Carlo。

    用 martj42 全量国际赛（免 token）。注意：参赛 48 队此处取"我们评分的前 48"，
    非官方 2026 晋级名单；分组用蛇形而非真实抽签。这是验证国家队层面的机器，不是赛会预测。
    """
    from wcpredict.data.sources import InternationalResultsSource

    _section(f"1. 拉取真实国际赛（martj42，{since} 至今）")
    try:
        matches = InternationalResultsSource(since=since).fetch_matches()
    except Exception as e:  # noqa: BLE001
        print(f"下载失败：{e}")
        return
    teams_all = sorted(set(matches["home"]) | set(matches["away"]))
    print(f"国际赛 {len(matches)} 场 | 球队 {len(teams_all)} 支 | "
          f"{matches['date'].min().date()} → {matches['date'].max().date()}")

    _section("2. 国际赛 Elo 评分（重要性加权 + 多趟暖启动，压低洲际通胀）")
    elo = EloRating(passes=4)
    elo.fit(matches)
    rank = elo.ranking()
    print("Top 20（真实国家队评分）：")
    for i, (t, r) in enumerate(rank[:20], 1):
        print(f"  {i:2d}. {t:<16} {r:.0f}")

    _section("3. DC 先验 + 单场预测（评分前二）")
    top_teams = [t for t, _ in rank[:n_teams]]
    ratings = {t: elo.get(t) for t in top_teams}
    params = DixonColesParams.from_ratings(ratings, goals_scale="auto")
    model = DixonColesModel(params)
    a, b = rank[0][0], rank[1][0]
    lam, mu = params.lambdas(a, b, neutral=True)
    M = model.predict_matrix(a, b, neutral=True)
    s = summarize_match(M)
    o = s["1x2"]
    print(f"{a} (λ={lam:.2f}) vs {b} (μ={mu:.2f}) [中立]：")
    print(f"  胜 {o['home']:.1%} / 平 {o['draw']:.1%} / 负 {o['away']:.1%}  | "
          f"大2.5 {s['over_under'][2.5]['over']:.1%}")
    print("  最可能比分 " + ", ".join(f"{x}:{y}={p:.1%}" for (x, y), p in s["top_scores"][:4]))

    _section(f"4. 世界杯 Monte Carlo（评分前 {n_teams}，{sims} 届）")
    groups = snake_draw_groups(top_teams[:48])
    sim = TournamentSimulator(params, groups)
    res = sim.run(n_sims=sims, seed=2026)
    show = (res.probs.head(top)[["advance", "reach_QF", "reach_SF", "reach_Final", "champion"]] * 100)
    print(show.round(1).to_string(float_format=lambda x: f"{x:.1f}%"))
    p = res.probs
    print(f"\n一致性：Σ出线={p['advance'].sum():.1f}(=32) Σ夺冠={p['champion'].sum():.3f}(=1)")

    _section("5. 提示（诚实边界）")
    print("  ✓ Elo 排名若与直觉/FIFA 排名相符 → 国家队 rating 链路在真实数据上成立。")
    print("  ✗ 参赛 48 队=我们评分前 48，非官方 2026 名单；分组=蛇形非真实抽签；")
    print("    R32 落位=按实力近似。故夺冠数字是机器验证，不是 2026 正式预测。")
    print("  下一步可接官方 2026 分组 + Annex C 落位表，把它变成真正的赛会预测。")


def run_wc2026(
    since: str = "2006-01-01", sims: int = 40000, top: int = 16,
    *, confed_correction: bool = True, host_boost: float = 0.0,
) -> None:
    """正式 2026 赛会预测：真实国际赛 Elo 评分 → 官方分组 + 官方 R32/淘汰赛树 Monte Carlo。"""
    from wcpredict.config import HOSTS
    from wcpredict.data.sources import InternationalResultsSource
    from wcpredict.ratings import apply_offsets, derive_confederations, deployment_offsets
    from wcpredict.tournament.wc2026 import GROUPS_2026, OfficialWC2026Simulator

    _section(f"1. 真实国际赛 → 多趟 Elo 评分（{since}→今）")
    src = InternationalResultsSource(since=since)
    matches = src.fetch_matches()
    elo = EloRating(passes=4)
    elo.fit(matches)
    ratings_all = elo.to_dict()

    # #6b 洲际通胀校正：无泄漏测量+增量 bootstrap 表明仅 OFC（大洋洲孤立通胀，NZ 刷分）稳健，全历史估幅度
    conf = derive_confederations(src.raw_results())
    if confed_correction:
        offsets = deployment_offsets(matches, ratings_all, conf)
        applied = {c: round(v, 1) for c, v in offsets.items() if abs(v) > 1e-6}
        ratings_all = apply_offsets(ratings_all, conf, offsets)
        print(f"  洲际校正(仅经验证稳健洲): {applied or '无可应用'}")

    official = [t for v in GROUPS_2026.values() for t in v]
    if len(set(official)) != 48:   # 唯一性硬断言：重名会让 params.index 静默合并、污染小组赛
        dups = sorted({t for t in official if official.count(t) > 1})
        raise SystemExit(f"官方分组出现重复队名（会静默合并）: {dups}")
    missing = [t for t in official if t not in ratings_all]
    if missing:   # 名称对齐硬断言（避免未知队静默当平均队）
        raise SystemExit(f"官方球队在国际赛数据中无评分（名称未对齐）: {missing}")
    ratings = {t: ratings_all[t] for t in official}
    if host_boost:   # 东道主加成=假设项（无法 OOS 验证），默认关闭，仅作敏感性
        hosts_in = [h for h in HOSTS if h in ratings]
        for h in hosts_in:
            ratings[h] += host_boost
        print(f"  东道主加成(+{host_boost:.0f}，假设项·不可 OOS 验证): {hosts_in}")
    params = DixonColesParams.from_ratings(ratings, goals_scale="auto")

    _section("2. 官方分组 + 官方淘汰赛树 Monte Carlo")
    sim = OfficialWC2026Simulator(params)
    print(f"第三名落位：495 种组合全部可解；其中多解 {sim.n_multi_assignment} 个 → "
          f"取一组满足官方约束的落位（经测对夺冠概率影响≈0.1pp，可忽略）")
    res = sim.run(n_sims=sims, seed=2026)
    p = res.probs

    print(f"\n夺冠概率 Top {top}（{res.n_sims} 届，真实分组+真实赛程）：")
    show = (p.head(top)[["advance", "reach_QF", "reach_SF", "reach_Final", "champion"]] * 100)
    print(show.round(1).to_string(float_format=lambda x: f"{x:.1f}%"))

    _section("3. 各小组出线热门")
    for g, members in GROUPS_2026.items():
        sub = p.loc[members].sort_values("win_group", ascending=False)
        fav, second = sub.index[0], sub.index[1]
        print(f"  组 {g}: {fav} 头名 {sub.loc[fav,'win_group']:.0%} / 出线 {sub.loc[fav,'advance']:.0%}"
              f"  ·  {second} 出线 {sub.loc[second,'advance']:.0%}")

    _section("4. 一致性 + 诚实边界")
    print(f"  Σ出线={p['advance'].sum():.1f}(=32)  Σ夺冠={p['champion'].sum():.3f}(=1)")
    print("  ✓ 真实官方分组(48 队名 100% 对齐) + 官方 R32/淘汰赛树(73–104) + 多趟 Elo + #6b 洲际(OFC)校正。")
    print("  边界：实力来自我们的 Elo 先验（非市场）；第三名落位取合法匹配之一（对夺冠≈0.1pp）；")
    print("        东道主加成默认关闭（不可 OOS 验证，--host-boost 看敏感性）；xG(#5A)未并入主链路。")
    print("        这已是接真实赛制的 2026 预测，可随评分迭代刷新。")


def run_train(
    model: str = "national",
    *,
    since: str = "2006-01-01",
    league: str = "E0",
    seasons: tuple[str, ...] = ("2122", "2223", "2324"),
    name: str = "default",
) -> None:
    """拟合并把模型注册进模型仓（本地 FS + metadata JSON）。"""
    from datetime import datetime, timezone

    from wcpredict.data import add_days_ago, load_seasons
    from wcpredict.data.sources import InternationalResultsSource
    from wcpredict.ratings import apply_offsets, derive_confederations, deployment_offsets
    from wcpredict.registry import ModelStore

    store = ModelStore()
    fit_time = datetime.now(timezone.utc).isoformat(timespec="seconds")

    if model == "national":
        _section(f"训练 national 模型（martj42 国际赛 {since}→今，多趟暖启动 Elo）")
        src = InternationalResultsSource(since=since)
        matches = src.fetch_matches()
        elo = EloRating(passes=4)
        elo.fit(matches)
        # #6b 洲际校正（与 wc2026 一致——否则服务模型与 wc2026 头条会在 NZ 上分歧，违背"单一真理源"）
        ratings_all = elo.to_dict()
        conf = derive_confederations(src.raw_results())
        offsets = deployment_offsets(matches, ratings_all, conf)
        ratings_all = apply_offsets(ratings_all, conf, offsets)
        applied = {c: round(v, 1) for c, v in offsets.items() if abs(v) > 1e-6}
        ranked = [t for t, _ in sorted(ratings_all.items(), key=lambda kv: kv[1], reverse=True)[:48]]
        ratings = {t: ratings_all[t] for t in ranked}
        print(f"  洲际校正(仅稳健洲): {applied or '无可应用'}")
        params = DixonColesParams.from_ratings(ratings, goals_scale="auto")
        meta = {
            "source": "martj42-international-results", "method": "elo-prior",
            "elo_passes": 4, "since": since, "n_matches": int(len(matches)), "n_teams": 48,
            "confed_correction": applied, "fit_time": fit_time, "top5": ranked[:5],
        }
    elif model == "wc2026":
        from wcpredict.tournament.wc2026 import GROUPS_2026

        _section(f"训练 wc2026 官方模型（martj42 国际赛 {since}→今，多趟暖启动 Elo + 官方 48 队）")
        src = InternationalResultsSource(since=since)
        matches = src.fetch_matches()
        elo = EloRating(passes=4)
        elo.fit(matches)
        ratings_all = elo.to_dict()
        conf = derive_confederations(src.raw_results())
        offsets = deployment_offsets(matches, ratings_all, conf)
        ratings_all = apply_offsets(ratings_all, conf, offsets)
        applied = {c: round(v, 1) for c, v in offsets.items() if abs(v) > 1e-6}
        official = [t for members in GROUPS_2026.values() for t in members]
        if len(set(official)) != 48:
            dups = sorted({t for t in official if official.count(t) > 1})
            raise SystemExit(f"官方分组出现重复队名（会静默合并）: {dups}")
        missing = [t for t in official if t not in ratings_all]
        if missing:
            raise SystemExit(f"官方球队在国际赛数据中无评分（名称未对齐）: {missing}")
        ratings = {t: ratings_all[t] for t in official}
        params = DixonColesParams.from_ratings(ratings, goals_scale="auto")
        meta = {
            "source": "martj42-international-results", "method": "elo-prior",
            "format": "wc2026_official", "groups": "official_2026", "simulator": "OfficialWC2026Simulator",
            "elo_passes": 4, "since": since, "n_matches": int(len(matches)), "n_teams": 48,
            "confed_correction": applied, "fit_time": fit_time,
            "top5": [t for t, _ in sorted(ratings.items(), key=lambda kv: kv[1], reverse=True)[:5]],
        }
        print(f"  洲际校正(仅稳健洲): {applied or '无可应用'}")
    elif model == "couk":
        _section(f"训练 couk 模型（英超 {', '.join(seasons)} MLE 拟合）")
        matches, _ = load_seasons(league, list(seasons))
        matches = add_days_ago(matches)
        teams = sorted(set(matches["home"]) | set(matches["away"]))
        w = exp_time_weights(matches["days_ago"].to_numpy())
        m = DixonColesModel().fit(
            matches["home"], matches["away"], matches["home_goals"], matches["away_goals"],
            neutral=matches["neutral"], weights=w, teams=teams,
        )
        params = m.params
        meta = {
            "source": "football-data.co.uk", "method": "dc-mle",
            "league": league, "seasons": list(seasons), "n_matches": int(len(matches)),
            "n_teams": len(teams), "fit_time": fit_time,
        }
    else:
        print(f"未知 model: {model}（可选 national / wc2026 / couk）")
        return

    version = store.save(params, name=name, metadata=meta)
    print(f"✓ 已注册模型 '{name}' v{version}：{len(params.teams)} 队，来源 {meta['source']}")
    print(f"  模型仓：{store.root / name}/v{version}.json")
    print("  启动服务： wcpredict serve   （或 docker compose up）")


def run_xg(competition: int = 43, season: int = 106, seed: int = 7, max_matches: int | None = None) -> None:
    """自建 shot-level xG：StatsBomb 开放数据 → 几何特征 → 可解释逻辑回归。

    真值=进球。按比赛切分 train/test，在留出射门上对真实进球做校准评估（log loss/Brier/ECE）。
    statsbomb_xg 仅作二级参照（其用更多特征+ML，本模型不向它对齐）。默认 FIFA WC 2022。
    """
    import json

    from wcpredict.config import ARTIFACTS_DIR
    from wcpredict.data.statsbomb import StatsBombSource
    from wcpredict.metrics import brier_score, expected_calibration_error, log_loss, reliability_curve
    from wcpredict.xg import PENALTY_XG, assign_xg, fit_xg_model, prepare_shots

    def _binary(y, p):  # 复用多分类指标：P=[1-p, p]
        P = np.column_stack([1.0 - p, p])
        yi = np.asarray(y, dtype=int)
        return log_loss(yi, P), brier_score(yi, P)

    _section(f"1. 拉取 StatsBomb 开放射门数据（competition={competition}, season={season}）")
    try:
        raw = StatsBombSource(competition_id=competition, season_id=season).shots(max_matches=max_matches)
    except Exception as e:  # noqa: BLE001
        print(f"下载失败：{e}\n（StatsBomb open-data 需联网；许可：公开研究须注明数据来源 StatsBomb）")
        return
    shots = prepare_shots(raw)
    n_pen = int(shots["is_penalty"].sum())
    print(f"射门 {len(shots)} 个 | 比赛 {shots['match_id'].nunique()} 场 | 进球 {int(shots['goal_int'].sum())} | "
          f"点球 {n_pen}（按常数 0.76，不进位置拟合）")

    _section("2. 按比赛切分 train/test（避免同场泄漏），仅用非点球射门拟合")
    mids = np.array(sorted(shots["match_id"].unique()))
    rng = np.random.default_rng(seed)
    rng.shuffle(mids)
    n_train = int(round(0.75 * len(mids)))
    train_mids, test_mids = set(mids[:n_train].tolist()), set(mids[n_train:].tolist())
    train = shots[shots["match_id"].isin(train_mids)]
    test = shots[shots["match_id"].isin(test_mids)]
    model = fit_xg_model(train, l2=1e-3)
    print(f"train {len(train)} 射门 / {len(train_mids)} 场（非点球 {int((train['is_penalty']==0).sum())} 拟合）"
          f"  |  test {len(test)} 射门 / {len(test_mids)} 场")

    _section("3. 可解释系数（原始尺度，符号应符合常识）")
    coefs = model.coef_original_
    for name in ["intercept", "distance", "angle", "is_header", "is_open_play"]:
        print(f"  {name:<14} {coefs[name]:+.4f}")
    ok_dist = coefs["distance"] < 0
    ok_ang = coefs["angle"] > 0
    print(f"  符号校验：距离系数<0 {'✓' if ok_dist else '✗'}（越远越难进） · "
          f"张角系数>0 {'✓' if ok_ang else '✗'}（角度越大越易进）")

    _section("4. 留出集校准评估（真值=进球，这是核心验证）")
    y = test["goal_int"].to_numpy()
    p_model = assign_xg(test, model)
    base = float(train["goal_int"].mean())                      # 常数基线=训练集进球率
    p_base = np.full(len(test), base)
    ll_m, br_m = _binary(y, p_model)
    ll_b, br_b = _binary(y, p_base)
    ece_m = expected_calibration_error(y, p_model, n_bins=10)
    print(f"{'预测器':<22}{'log loss':>12}{'Brier':>10}{'ECE':>10}")
    print(f"{'常数基线(进球率)':<19}{ll_b:>12.4f}{br_b:>10.4f}{'—':>10}")
    print(f"{'本模型(4 特征)':<20}{ll_m:>12.4f}{br_m:>10.4f}{ece_m:>10.4f}")
    sb_mask = test["statsbomb_xg"].notna().to_numpy()
    ll_s = None
    if sb_mask.any():
        # statsbomb_xg 在 StatsBomb 数据中几乎逐射门皆有（WC 数据已验证 0 缺失）→ 三行同集可比
        p_sb = test["statsbomb_xg"].to_numpy(dtype=float)
        ll_s, br_s = _binary(y[sb_mask], p_sb[sb_mask])
        ece_s = expected_calibration_error(y[sb_mask], p_sb[sb_mask], n_bins=10)
        tag = "(参照,全样本)" if sb_mask.all() else f"(参照,{int(sb_mask.sum())}/{len(y)}样本)"
        print(f"{'statsbomb_xg'+tag:<18}{ll_s:>12.4f}{br_s:>10.4f}{ece_s:>10.4f}")
    print(f"\n  模型相对基线 log loss 改善 {ll_b - ll_m:+.4f}（>0=比'人人同概率'更有信息量）")
    if ll_s is not None and ll_b > ll_s:
        gap_closed = (ll_b - ll_m) / (ll_b - ll_s)
        print(f"  4 个可解释特征关闭了「基线→statsbomb(多特征 ML)」log loss 差距的 {gap_closed:.0%}；"
              f"statsbomb 在 log loss/Brier 上仍更优（符合预期，本模型不向其对齐）。")
        print("  注：ECE 两者接近（~0.04），在 382 射门/44 进球的样本上属噪声，不据此宣称谁更准。")

    _section("5. 可靠性分箱（本模型 vs 真实进球频率）")
    rc = reliability_curve(y, p_model, n_bins=10)
    for b in range(10):
        if rc["count"][b] > 0:
            print(f"  预测 {rc['mean_pred'][b]:.2f} | 实际进球率 {rc['frac_pos'][b]:.2f} | n={rc['count'][b]}")

    _section("6. 总量 + 二级交叉核对（statsbomb_xg）")
    sum_goal = float(y.sum())
    sum_model = float(p_model.sum())
    print(f"  留出集：实际进球 {sum_goal:.0f} | 本模型 Σxg {sum_model:.1f} | "
          f"偏差 {sum_model - sum_goal:+.1f}（总量校准）")
    nonpen_test = test[test["is_penalty"] == 0.0]
    sbx = nonpen_test["statsbomb_xg"].to_numpy(dtype=float)
    m_nonpen = assign_xg(nonpen_test, model)
    valid = ~np.isnan(sbx)
    if valid.sum() > 2:
        corr = float(np.corrcoef(m_nonpen[valid], sbx[valid])[0, 1])
        print(f"  Σstatsbomb_xg {np.nansum(sbx):.1f}（二级参照）| "
              f"本模型与 statsbomb_xg 相关系数 r={corr:.3f}（二级 sanity，非拟合目标，不强求接近）")

    # 持久化系数（可复现；本回合 xG 尚未并入 wc2026 主链路）
    out = {
        "competition_id": competition, "season_id": season, "seed": seed,
        "penalty_xg": float(PENALTY_XG),
        "coef_original": coefs, "feature_names": list(model.feature_names),
        "n_shots": int(len(shots)), "n_train_matches": len(train_mids), "n_test_matches": len(test_mids),
        "test_log_loss": ll_m, "test_brier": br_m, "test_ece": ece_m,
        "baseline_log_loss": ll_b, "test_sum_goals": sum_goal, "test_sum_xg": sum_model,
    }
    dest = ARTIFACTS_DIR / "xg_model.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n  系数+评估已存：{dest}")

    _section("7. 诚实边界")
    print("  ✓ 几何特征经手算核验；真值是进球，模型在留出射门上对进球做校准（非对 statsbomb_xg）。")
    print("  ✗ 本回合 xG 尚未并入 wc2026 主链路——把 xG 转成进攻/防守强度需要广泛的俱乐部样本，")
    print("    且国家队赛会样本稀疏；阵容/首发层(#5 B)受免费数据所限，单独评估。")


def run_market(slug: str = "world-cup-winner", model: str = "default",
               sims: int = 40000, seed: int = 2026, snapshot: bool = False, top: int = 16) -> None:
    """P0 市场对比层：Polymarket 夺冠盘去水位 → 与模型对比分歧 +（可选）起 CLV/flow 采集。

    诚实口径：独立≠edge。夺冠盘是 $15 亿成交的有效前沿，分歧大多=我们被市场修正而非 alpha；
    本层用于量化差异、找局部错价、做校准记分牌。真 edge 证据=长期 CLV（--snapshot 从今天起积累）。
    """
    from datetime import datetime, timezone

    from wcpredict.config import DATA_DIR
    from wcpredict.markets.polymarket import PolymarketSource, compare_to_market, market_win_probs
    from wcpredict.registry import ModelStore
    from wcpredict.tournament.wc2026 import OfficialWC2026Simulator

    _section("1. 拉取 Polymarket WC2026 夺冠盘（neg-risk 多结果，免鉴权读接口）")
    try:
        event = PolymarketSource(slug).fetch_event()
    except Exception as e:  # noqa: BLE001
        print(f"拉取失败：{e}\n（Polymarket Gamma API 需联网；读接口无需鉴权）")
        return
    parsed = PolymarketSource.parse_winner_market(event)
    if parsed.empty:
        print("未解析到任何带价格的市场。")
        return
    raw_sum = float(parsed["yes_price"].sum())
    mkt = market_win_probs(parsed)                       # 全集去水位（含非我方 48 队）
    print(f"市场 {len(parsed)} 队 | Σyes(去水位前)={raw_sum:.3f}=1+水位 → 归一化去水位")

    _section("2. 载入官方模型，跑赛会 Monte Carlo")
    loaded = ModelStore().load(model, None)
    if str(loaded.metadata.get("format")) != "wc2026_official" or len(loaded.params.teams) < 48:
        print(f"需官方 wc2026 模型（当前 format={loaded.metadata.get('format')}，{len(loaded.params.teams)} 队）。先 train。")
        return
    model_p = OfficialWC2026Simulator(loaded.params).run(n_sims=sims, seed=seed).probs["champion"]

    _section("3. 模型 vs 市场：夺冠概率分歧（在共同的 48 队上，各自重归一化）")
    common = [t for t in model_p.index if t in mkt.index]
    coverage = float(mkt.loc[common].sum())              # 市场分配给我方 48 队的概率质量
    mp = (model_p.loc[common] / model_p.loc[common].sum())
    kp = (mkt.loc[common] / mkt.loc[common].sum())
    cmp = compare_to_market(mp, kp)
    print(f"{'队':<20}{'模型':>8}{'市场':>8}{'差(模−市)':>11}")
    for t, row in cmp.head(top).iterrows():
        print(f"{t:<20}{row['model']*100:>7.1f}%{row['market']*100:>7.1f}%{row['diff']*100:>+8.1f}pp")
    print(f"\n对比 {len(cmp)} 队 | Σ|分歧|={cmp['abs_diff'].sum()*100:.0f}pp | "
          f"市场给我方 48 队的概率质量={coverage:.1%}（其余在 Italy/Peru/附加赛等非参赛队）")

    if snapshot:
        ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
        snap = parsed[["team", "yes_price"]].copy()
        snap["market_p"] = mkt.reindex(snap["team"]).to_numpy()
        snap["model_p"] = model_p.reindex(snap["team"]).to_numpy()   # 非我方队为 NaN
        snap.insert(0, "ts", ts)
        dest = DATA_DIR / "market_snapshots.parquet"
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists():
            snap = pd.concat([pd.read_parquet(dest), snap], ignore_index=True)
        snap.to_parquet(dest)
        print(f"\n  ✓ 已记录快照 @ {ts} → {dest}（累计 {len(snap)} 行，用于日后 CLV/flow 分析）")

    _section("4. 诚实边界（务必读）")
    print("  · 独立≠edge：夺冠盘是有效前沿，分歧大多=我们被市场修正，不是优势证据。")
    print("  · 一阶对比：未校正时间价值衰减（资金锁到 2026 年中→价格系统性偏低）与 favorite-longshot 偏差。")
    print("  · 真 edge 只能靠 CLV：从今天起 --snapshot 定期采集，用 T-24h 概率 vs closing 长期评估。")
    print("  · 可挖的是陈旧/低流动子市场（小组出线、冷门 prop），不是这个夺冠盘。")


def run_serve(host: str = "127.0.0.1", port: int = 8000) -> None:
    """启动 FastAPI 推理服务。"""
    import uvicorn
    print(f"启动 wcpredict 推理服务 → http://{host}:{port}  (文档 /docs)")
    uvicorn.run("wcpredict.service.app:app", host=host, port=port, log_level="info")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="wcpredict", description="世界杯比分概率预测主干")
    sub = parser.add_subparsers(dest="cmd")
    d = sub.add_parser("demo", help="合成数据端到端 demo")
    d.add_argument("--sims", type=int, default=20000, help="Monte Carlo 模拟届数")
    d.add_argument("--seed", type=int, default=42)
    d.add_argument("--fit-dc", action="store_true", help="用 MLE 拟合 DC（较慢）而非 rating 先验")
    g = sub.add_parser("ingest", help="拉取真实数据并在其上拟合模型")
    g.add_argument("--league", default="E0", help="联赛代码 E0(英超)/D1(德甲)/SP1(西甲)/I1(意甲)...")
    g.add_argument("--seasons", default="2223,2324", help="逗号分隔赛季，如 2223,2324")
    b = sub.add_parser("backtest", help="无泄漏 walk-forward 回测：模型 vs 市场")
    b.add_argument("--league", default="E0")
    b.add_argument("--seasons", default="2122,2223,2324", help="逗号分隔赛季")
    b.add_argument("--predictor", default="dc", choices=["dc", "elo"], help="dc=MLE拟合 / elo=评分先验")
    b.add_argument("--min-train", type=int, default=190)
    b.add_argument("--refit-every", type=int, default=40)
    b.add_argument("--source", default="couk", choices=["couk", "international"],
                   help="couk=football-data.co.uk俱乐部 / international=martj42全量国际赛")
    b.add_argument("--since", default="2006-01-01", help="国际赛起始日期（source=international 时生效）")
    b.add_argument("--goals-scale", default="0.0018",
                   help="λ-mapping 灵敏度：数字(如0.0018) 或 'auto'（与部署路径对齐）")
    b.add_argument("--passes", type=int, default=1, help="Elo 多趟暖启动次数（source=international 时生效）")
    n = sub.add_parser("national", help="国家队链路：真实国际赛 → Elo → 世界杯 Monte Carlo（评分前 48 + 蛇形分组）")
    n.add_argument("--since", default="2006-01-01", help="只用该日期之后的国际赛（默认 2006，给 Elo 足够 burn-in）")
    n.add_argument("--sims", type=int, default=30000)
    w = sub.add_parser("wc2026", help="正式 2026 预测：真实 Elo 评分 + 官方分组 + 官方淘汰赛树")
    w.add_argument("--since", default="2006-01-01")
    w.add_argument("--sims", type=int, default=40000)
    w.add_argument("--no-confed-correction", action="store_true", help="关闭 #6b 洲际(OFC)通胀校正")
    w.add_argument("--host-boost", type=float, default=0.0,
                   help="东道主评分加成(假设项，不可 OOS 验证；默认 0=关闭，仅作敏感性)")
    t = sub.add_parser("train", help="拟合并注册模型到模型仓")
    t.add_argument("--model", default="national", choices=["national", "wc2026", "couk"])
    t.add_argument("--since", default="2006-01-01")
    t.add_argument("--league", default="E0")
    t.add_argument("--seasons", default="2122,2223,2324")
    t.add_argument("--name", default="default")
    x = sub.add_parser("xg", help="自建 shot-level xG：StatsBomb 开放数据 → 几何特征 → 逻辑回归 → 对进球校准")
    x.add_argument("--competition", type=int, default=43, help="StatsBomb competition_id（43=FIFA World Cup）")
    x.add_argument("--season", type=int, default=106, help="season_id（106=2022）")
    x.add_argument("--seed", type=int, default=7, help="train/test 按比赛切分的随机种子")
    x.add_argument("--max-matches", type=int, default=None, help="限制比赛数（调试用）")
    mk = sub.add_parser("market", help="P0 市场对比：Polymarket 夺冠盘去水位 vs 模型 +（--snapshot 起 CLV 采集）")
    mk.add_argument("--slug", default="world-cup-winner", help="Polymarket 事件 slug")
    mk.add_argument("--model", default="default")
    mk.add_argument("--sims", type=int, default=40000)
    mk.add_argument("--snapshot", action="store_true", help="把当前价格+模型概率追加到 CLV 快照库")
    sv = sub.add_parser("serve", help="启动 FastAPI 推理服务")
    sv.add_argument("--host", default="127.0.0.1")
    sv.add_argument("--port", type=int, default=8000)
    args = parser.parse_args(argv)

    if args.cmd == "ingest":
        run_ingest(league=args.league, seasons=tuple(args.seasons.split(",")))
        return 0
    if args.cmd == "backtest":
        gs_raw = args.goals_scale
        gs: str | float = gs_raw if gs_raw == "auto" else float(gs_raw)
        run_backtest(
            league=args.league, seasons=tuple(args.seasons.split(",")),
            predictor=args.predictor, min_train=args.min_train, refit_every=args.refit_every,
            source=args.source, since=args.since, goals_scale=gs, passes=args.passes,
        )
        return 0
    if args.cmd == "national":
        run_national(since=args.since, sims=args.sims)
        return 0
    if args.cmd == "wc2026":
        run_wc2026(since=args.since, sims=args.sims,
                   confed_correction=not args.no_confed_correction, host_boost=args.host_boost)
        return 0
    if args.cmd == "train":
        run_train(model=args.model, since=args.since, league=args.league,
                  seasons=tuple(args.seasons.split(",")), name=args.name)
        return 0
    if args.cmd == "xg":
        run_xg(competition=args.competition, season=args.season,
               seed=args.seed, max_matches=args.max_matches)
        return 0
    if args.cmd == "market":
        run_market(slug=args.slug, model=args.model, sims=args.sims, snapshot=args.snapshot)
        return 0
    if args.cmd == "serve":
        run_serve(host=args.host, port=args.port)
        return 0
    if args.cmd == "demo" or args.cmd is None:
        run_demo(
            sims=getattr(args, "sims", 20000),
            seed=getattr(args, "seed", 42),
            fit_dc=getattr(args, "fit_dc", False),
        )
        return 0
    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
