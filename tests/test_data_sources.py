"""数据采集器：解析/归一化逻辑离线测试（不触网，用内嵌样本）。"""
import pandas as pd
import pytest

from wcpredict.data import add_days_ago, validate_matches
from wcpredict.data.schema import SchemaError
from wcpredict.data.sources import (
    FootballDataCoUkSource,
    FootballDataOrgSource,
    InternationalResultsSource,
)

# football-data.co.uk 真实表头的精简样本（含 Pinnacle PS/PSC、Bet365、Avg）
_CSV = (
    "Div,Date,HomeTeam,AwayTeam,FTHG,FTAG,FTR,B365H,B365D,B365A,PSH,PSD,PSA,PSCH,PSCD,PSCA,AvgH,AvgD,AvgA\n"
    "E0,11/08/2023,Burnley,Man City,0,3,A,8.0,5.5,1.33,8.58,5.51,1.37,8.20,5.60,1.40,8.02,5.35,1.35\n"
    "E0,12/08/2023,Arsenal,Forest,2,1,H,1.30,5.5,9.0,1.31,5.70,9.50,1.33,5.50,9.20,1.31,5.45,9.10\n"
    "E0,12/08/2023,,,,,,,,,,,,,,,,,\n"  # 末尾空行，应被丢弃
)


def test_couk_normalize_matches():
    raw = FootballDataCoUkSource.parse_csv_text(_CSV)
    m = FootballDataCoUkSource.normalize_matches(raw)
    assert len(m) == 2                                  # 空行被剔除
    assert list(m.columns) == ["date", "home", "away", "home_goals", "away_goals", "neutral", "importance"]
    row = m.iloc[0]
    assert row["home"] == "Burnley" and row["away"] == "Man City"
    assert row["home_goals"] == 0 and row["away_goals"] == 3
    assert row["neutral"] == False                       # 俱乐部赛非中立  # noqa: E712
    assert m["date"].dt.year.tolist() == [2023, 2023]


def test_couk_extract_odds_long_table():
    raw = FootballDataCoUkSource.parse_csv_text(_CSV)
    odds = FootballDataCoUkSource.extract_odds(raw)
    # 3 家 × 时点：pinnacle prematch/closing、bet365 prematch、avg prematch = 4 组 × 2 场 = 8 行
    books = set(zip(odds["book"], odds["snapshot"]))
    assert ("pinnacle", "prematch") in books
    assert ("pinnacle", "closing") in books
    assert ("bet365", "prematch") in books
    assert ("avg", "prematch") in books
    # 赔率均 > 1
    assert (odds[["odds_home", "odds_draw", "odds_away"]] > 1.0).all().all()
    # Pinnacle closing 第一场客胜赔率
    psc = odds[(odds["book"] == "pinnacle") & (odds["snapshot"] == "closing")].iloc[0]
    assert psc["odds_away"] == pytest.approx(1.40)


def test_couk_odds_feed_devig():
    """采集器赔率应能直接喂给去水位层。"""
    from wcpredict.odds import devig
    import numpy as np
    raw = FootballDataCoUkSource.parse_csv_text(_CSV)
    odds = FootballDataCoUkSource.extract_odds(raw)
    one = odds.iloc[0]
    p = devig(np.array([one["odds_home"], one["odds_draw"], one["odds_away"]]), "shin")
    assert p.sum() == pytest.approx(1.0)


def test_org_parse_matches_json():
    payload = {"matches": [
        {"status": "FINISHED", "utcDate": "2022-12-18T15:00:00Z", "stage": "FINAL",
         "homeTeam": {"name": "Argentina"}, "awayTeam": {"name": "France"},
         "score": {"fullTime": {"home": 3, "away": 3}}},
        {"status": "FINISHED", "utcDate": "2022-12-09T15:00:00Z", "stage": "QUARTER_FINALS",
         "homeTeam": {"name": "Netherlands"}, "awayTeam": {"name": "Argentina"},
         "score": {"fullTime": {"home": 2, "away": 2}}},
        {"status": "SCHEDULED", "utcDate": "2026-06-11T16:00:00Z",
         "homeTeam": {"name": "X"}, "awayTeam": {"name": "Y"},
         "score": {"fullTime": {"home": None, "away": None}}},
    ]}
    m = FootballDataOrgSource.parse_matches(payload, neutral=True).set_index("home")
    assert len(m) == 2                                   # 仅 2 场 FINISHED
    assert m.loc["Argentina", "neutral"] == True         # noqa: E712
    assert m.loc["Argentina", "importance"] == 1.5       # 决赛
    # 关键：QUARTER_FINALS 不能因 "FINAL" 子串误判为 1.5
    assert m.loc["Netherlands", "importance"] == 1.3


def test_org_requires_token(monkeypatch):
    monkeypatch.delenv("FOOTBALL_DATA_TOKEN", raising=False)
    src = FootballDataOrgSource(token=None)
    with pytest.raises(RuntimeError, match="token"):
        src.fetch_matches()


_INTL_CSV = (
    "date,home_team,away_team,home_score,away_score,tournament,city,country,neutral\n"
    "2010-06-11,South Africa,Mexico,1,1,FIFA World Cup,Johannesburg,South Africa,FALSE\n"
    "2018-07-15,France,Croatia,4,2,FIFA World Cup,Moscow,Russia,TRUE\n"
    "2023-03-24,Brazil,Argentina,0,1,Friendly,Rio,Brazil,FALSE\n"
)


def test_intl_normalize_and_importance():
    raw = InternationalResultsSource.parse_csv_text(_INTL_CSV)
    # 只取 2015 之后
    m = InternationalResultsSource.normalize_matches(raw, since=pd.Timestamp("2015-01-01"))
    assert len(m) == 2                                   # 2010 那场被滤掉
    fr = m[m["home"] == "France"].iloc[0]
    assert fr["neutral"] == True                         # 决赛中立场  # noqa: E712
    assert fr["importance"] == 1.6                       # FIFA World Cup 权重
    fri = m[m["home"] == "Brazil"].iloc[0]
    assert fri["importance"] == 0.8                      # 友谊赛低权重
    assert fri["neutral"] == False                       # noqa: E712


def test_add_days_ago():
    m = validate_matches(pd.DataFrame({
        "date": ["2024-01-01", "2024-01-11"], "home": ["A", "C"], "away": ["B", "D"],
        "home_goals": [1, 2], "away_goals": [0, 2], "neutral": [False, True], "importance": [1.0, 1.0],
    }))
    out = add_days_ago(m, ref_date="2024-01-11")
    assert out["days_ago"].tolist() == [10, 0]


def test_validate_rejects_self_play():
    with pytest.raises(SchemaError, match="主客队相同"):
        validate_matches(pd.DataFrame({
            "date": ["2024-01-01"], "home": ["A"], "away": ["A"],
            "home_goals": [1], "away_goals": [0], "neutral": [False], "importance": [1.0],
        }))
