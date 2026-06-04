"""时间滚动 (walk-forward) cutoff 回测引擎。

铁律：预测第 i 场时，预测器只能用**日期严格早于该场**的比赛拟合（连同日比赛都排除）。
模型在每场出 1X2，市场基准由 cutoff 前可得的赛前赔率去水位得到，二者在同一持出集上比较。
这是文档"信息截止纪律"的落地——任何复用全样本拟合都会让回测变成自欺。
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from wcpredict.backtest.predictors import Predictor
from wcpredict.data.schema import validate_matches
from wcpredict.metrics import brier_score, expected_calibration_error, log_loss, reliability_curve
from wcpredict.odds import devig


def _outcome(hg: int, ag: int) -> int:
    return 0 if hg > ag else (1 if hg == ag else 2)


@dataclass
class BacktestResult:
    per_match: pd.DataFrame
    predictor_name: str
    refit_every: int
    min_train: int

    def assert_leakfree(self) -> bool:
        """核验：每条预测所用训练集的最新日期都严格早于被预测比赛日期。"""
        d = self.per_match
        return bool((d["train_max_date"] < d["date"]).all())

    def metrics(self) -> dict:
        d = self.per_match
        y = d["outcome"].to_numpy()
        Pm = d[["pm_home", "pm_draw", "pm_away"]].to_numpy()
        out = {
            "predictor": self.predictor_name,
            "n_predictions": int(len(d)),
            "leak_free": self.assert_leakfree(),
            "model_all": {"log_loss": log_loss(y, Pm), "brier": brier_score(y, Pm)},
        }
        mk = d[d["has_market"]]
        if len(mk):
            ymk = mk["outcome"].to_numpy()
            Pmod = mk[["pm_home", "pm_draw", "pm_away"]].to_numpy()
            Pmkt = mk[["mk_home", "mk_draw", "mk_away"]].to_numpy()
            out["n_with_market"] = int(len(mk))
            out["market"] = {"log_loss": log_loss(ymk, Pmkt), "brier": brier_score(ymk, Pmkt)}
            out["model_on_market_set"] = {"log_loss": log_loss(ymk, Pmod), "brier": brier_score(ymk, Pmod)}
            out["mean_abs_divergence"] = float(np.mean(np.abs(Pmod - Pmkt)))
        return out

    def reliability(self, outcome: str = "home", n_bins: int = 10) -> dict:
        col = {"home": ("pm_home", 0), "draw": ("pm_draw", 1), "away": ("pm_away", 2)}[outcome]
        d = self.per_match
        y_bin = (d["outcome"].to_numpy() == col[1]).astype(float)
        rc = reliability_curve(y_bin, d[col[0]].to_numpy(), n_bins)
        rc["ece"] = expected_calibration_error(y_bin, d[col[0]].to_numpy(), n_bins)
        return rc


class WalkForwardBacktest:
    def __init__(self, matches: pd.DataFrame, odds: pd.DataFrame | None = None):
        self.matches = validate_matches(matches)        # 排序 + 规整
        self.odds = odds

    def _odds_map(self, book: str, snapshot: str) -> dict:
        if self.odds is None or len(self.odds) == 0:
            return {}
        o = self.odds[(self.odds["book"] == book) & (self.odds["snapshot"] == snapshot)]
        m = {}
        for _, r in o.iterrows():
            m[(pd.Timestamp(r["date"]), r["home"], r["away"])] = (
                r["odds_home"], r["odds_draw"], r["odds_away"]
            )
        return m

    def run(
        self,
        predictor: Predictor,
        *,
        min_train: int = 200,
        refit_every: int = 40,
        market_book: str = "pinnacle",
        market_snapshot: str = "prematch",
        devig_method: str = "multiplicative",
    ) -> BacktestResult:
        m = self.matches
        dates = m["date"].to_numpy()
        odds_map = self._odds_map(market_book, market_snapshot)

        records: list[dict] = []
        preds_since_fit = refit_every          # 强制首次拟合
        train_max_date: pd.Timestamp | None = None

        for i in range(len(m)):
            row = m.iloc[i]
            # 严格早于本场日期的比赛数（含同日比赛一并排除）
            k = int(np.searchsorted(dates, np.datetime64(row["date"]), side="left"))
            if k < min_train:
                continue
            if preds_since_fit >= refit_every:
                train = m.iloc[:k]
                predictor.fit(train)
                train_max_date = train["date"].max()
                preds_since_fit = 0

            p = predictor.predict_1x2(row["home"], row["away"], bool(row["neutral"]))
            preds_since_fit += 1

            rec = {
                "date": row["date"], "home": row["home"], "away": row["away"],
                "outcome": _outcome(int(row["home_goals"]), int(row["away_goals"])),
                "pm_home": p[0], "pm_draw": p[1], "pm_away": p[2],
                "train_max_date": train_max_date,
            }
            key = (pd.Timestamp(row["date"]), row["home"], row["away"])
            if key in odds_map:
                pk = devig(np.array(odds_map[key], dtype=float), devig_method)
                rec.update(has_market=True, mk_home=pk[0], mk_draw=pk[1], mk_away=pk[2])
            else:
                rec.update(has_market=False, mk_home=np.nan, mk_draw=np.nan, mk_away=np.nan)
            records.append(rec)

        per_match = pd.DataFrame.from_records(records)
        return BacktestResult(
            per_match=per_match, predictor_name=predictor.name,
            refit_every=refit_every, min_train=min_train,
        )
