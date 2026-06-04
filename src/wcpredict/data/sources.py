"""数据源采集器：把各家来源归一化到规范 schema（schema.py）。

- FootballDataCoUkSource：免授权 CSV（历史结果+多家赔率，含 closing），可立即真跑。
- FootballDataOrgSource：football-data.org API（需 token），赛程/球队/比分主数据。
解析逻辑（parse_*）与网络下载分离，便于离线单测。原始拉取缓存到 data/raw/（原始数据层）。
"""
from __future__ import annotations

import io
import json
import time
import urllib.error
import urllib.request
from abc import ABC, abstractmethod
from pathlib import Path

import pandas as pd

from wcpredict.config import DATA_DIR
from wcpredict.data.schema import validate_matches, validate_odds

_UA = "Mozilla/5.0 (wcpredict data ingestion)"
RAW_DIR = DATA_DIR / "raw"


def _download(
    url: str, dest: Path, *, force: bool = False, timeout: int = 30, retries: int = 4
) -> Path:
    """下载到本地缓存（原始数据层），带有界重试 + 原子写。

    已存在且非 force 时直接复用。瞬时网络/SSL 抖动（大批量拉取常见）做指数退避重试，
    全部失败才抛最后一次异常。先写临时文件再原子替换，避免中断留下半截缓存。
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and not force:
        return dest
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
                data = resp.read()
            tmp = dest.with_suffix(dest.suffix + ".part")
            tmp.write_bytes(data)
            tmp.replace(dest)        # 原子替换
            return dest
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(1.5 * (2 ** attempt))    # 1.5s, 3s, 6s ... 退避
    raise last_err  # type: ignore[misc]


class MatchDataSource(ABC):
    """比赛数据源统一接口。"""

    name: str = "base"

    @abstractmethod
    def fetch_matches(self) -> pd.DataFrame:
        """返回规范比赛主数据（schema.MATCH_COLUMNS）。"""

    def fetch_odds(self) -> pd.DataFrame | None:
        """返回规范赔率长表（schema.ODDS_COLUMNS），无则 None。"""
        return None


# ============================ football-data.co.uk ============================
class FootballDataCoUkSource(MatchDataSource):
    """免授权历史 CSV：https://www.football-data.co.uk/mmz4281/{season}/{league}.csv

    season 形如 '2324'，league 形如 'E0'(英超)/'D1'(德甲)/'SP1'(西甲)。
    """

    name = "football-data.co.uk"
    BASE = "https://www.football-data.co.uk/mmz4281"

    # 赔率列映射：内部 book/snapshot → CSV 列前缀（H/D/A 后缀）
    _ODDS_MAP = {
        ("pinnacle", "prematch"): "PS",
        ("pinnacle", "closing"): "PSC",
        ("bet365", "prematch"): "B365",
        ("bet365", "closing"): "B365C",
        ("avg", "prematch"): "Avg",
        ("max", "prematch"): "Max",
    }

    def __init__(self, league: str = "E0", season: str = "2324", *, force_download: bool = False):
        self.league = league
        self.season = season
        self.force_download = force_download
        self._raw: pd.DataFrame | None = None

    @property
    def url(self) -> str:
        return f"{self.BASE}/{self.season}/{self.league}.csv"

    @staticmethod
    def parse_csv_text(text: str) -> pd.DataFrame:
        """把 CSV 文本解析成原始 DataFrame（含全部原始列）。"""
        return pd.read_csv(io.StringIO(text), encoding_errors="ignore")

    def _load_raw(self) -> pd.DataFrame:
        if self._raw is not None:
            return self._raw
        dest = RAW_DIR / f"fd_couk_{self.league}_{self.season}.csv"
        _download(self.url, dest, force=self.force_download)
        text = dest.read_bytes().decode("latin-1")
        self._raw = self.parse_csv_text(text)
        return self._raw

    @staticmethod
    def normalize_matches(raw: pd.DataFrame) -> pd.DataFrame:
        """原始列 → 规范比赛主数据。俱乐部赛：非中立场、重要性=1。"""
        df = pd.DataFrame({
            "date": pd.to_datetime(raw["Date"], dayfirst=True, errors="coerce"),
            "home": raw["HomeTeam"],
            "away": raw["AwayTeam"],
            "home_goals": raw["FTHG"],
            "away_goals": raw["FTAG"],
            "neutral": False,
            "importance": 1.0,
        })
        return validate_matches(df)

    @classmethod
    def extract_odds(cls, raw: pd.DataFrame) -> pd.DataFrame:
        """抽取所有可得的 (book, snapshot) 1X2 赔率为长表。"""
        base = pd.DataFrame({
            "date": pd.to_datetime(raw["Date"], dayfirst=True, errors="coerce"),
            "home": raw["HomeTeam"],
            "away": raw["AwayTeam"],
        })
        frames = []
        for (book, snapshot), pref in cls._ODDS_MAP.items():
            cols = {"home": f"{pref}H", "draw": f"{pref}D", "away": f"{pref}A"}
            if not all(c in raw.columns for c in cols.values()):
                continue
            part = base.copy()
            part["book"] = book
            part["snapshot"] = snapshot
            part["odds_home"] = pd.to_numeric(raw[cols["home"]], errors="coerce")
            part["odds_draw"] = pd.to_numeric(raw[cols["draw"]], errors="coerce")
            part["odds_away"] = pd.to_numeric(raw[cols["away"]], errors="coerce")
            frames.append(part)
        if not frames:
            return validate_odds(pd.DataFrame(columns=["date", "home", "away", "book",
                                                       "snapshot", "odds_home", "odds_draw", "odds_away"]))
        return validate_odds(pd.concat(frames, ignore_index=True))

    def fetch_matches(self) -> pd.DataFrame:
        return self.normalize_matches(self._load_raw())

    def fetch_odds(self) -> pd.DataFrame:
        return self.extract_odds(self._load_raw())


def load_seasons(
    league: str, seasons: list[str], *, force_download: bool = False
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """拉取并合并多个赛季（足够样本量做 rating/拟合）。返回 (matches, odds)。"""
    m_frames, o_frames = [], []
    for s in seasons:
        src = FootballDataCoUkSource(league, s, force_download=force_download)
        m_frames.append(src.fetch_matches())
        o_frames.append(src.fetch_odds())
    matches = validate_matches(pd.concat(m_frames, ignore_index=True))
    odds = validate_odds(pd.concat(o_frames, ignore_index=True))
    return matches, odds


# ============================ football-data.org API ============================
class FootballDataOrgSource(MatchDataSource):
    """football-data.org v4 API（需 token，环境变量 FOOTBALL_DATA_TOKEN 或构造传入）。

    适合赛程/球队/比分主数据；国家队赛事（competition='WC'）默认中立场。
    """

    name = "football-data.org"
    BASE = "https://api.football-data.org/v4"

    # 阶段 → 重要性权重（精确匹配，避免 "FINAL" 子串误命中 QUARTER_FINALS/SEMI_FINALS）
    _STAGE_IMPORTANCE = {
        "GROUP_STAGE": 1.0,
        "LAST_16": 1.2,
        "QUARTER_FINALS": 1.3,
        "SEMI_FINALS": 1.4,
        "THIRD_PLACE": 1.0,
        "FINAL": 1.5,
    }

    def __init__(
        self,
        competition: str = "WC",
        season: int | None = None,
        *,
        token: str | None = None,
        neutral: bool | None = None,
    ):
        import os
        self.competition = competition
        self.season = season
        self.token = token or os.environ.get("FOOTBALL_DATA_TOKEN")
        # 国家队赛事默认中立场；俱乐部联赛默认非中立
        self.neutral = neutral if neutral is not None else (competition.upper() == "WC")

    @staticmethod
    def parse_matches(payload: dict, neutral: bool = False) -> pd.DataFrame:
        """API matches JSON → 规范比赛主数据（仅取已完赛 FINISHED）。"""
        rows = []
        for m in payload.get("matches", []):
            if m.get("status") != "FINISHED":
                continue
            ft = (m.get("score") or {}).get("fullTime") or {}
            if ft.get("home") is None or ft.get("away") is None:
                continue
            stage = (m.get("stage") or "").upper()
            importance = FootballDataOrgSource._STAGE_IMPORTANCE.get(stage, 1.0)
            rows.append({
                "date": m.get("utcDate"),
                "home": (m.get("homeTeam") or {}).get("name"),
                "away": (m.get("awayTeam") or {}).get("name"),
                "home_goals": ft.get("home"),
                "away_goals": ft.get("away"),
                "neutral": neutral,
                "importance": importance,
            })
        return validate_matches(pd.DataFrame(rows))

    def _get(self, path: str) -> dict:
        if not self.token:
            raise RuntimeError(
                "football-data.org 需要 token：设置环境变量 FOOTBALL_DATA_TOKEN "
                "或 FootballDataOrgSource(token=...)。免费 token 见 football-data.org/client/register"
            )
        url = f"{self.BASE}/{path}"
        req = urllib.request.Request(url, headers={"X-Auth-Token": self.token, "User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
            return json.loads(resp.read().decode("utf-8"))

    def fetch_matches(self) -> pd.DataFrame:
        path = f"competitions/{self.competition}/matches"
        if self.season:
            path += f"?season={self.season}"
        return self.parse_matches(self._get(path), neutral=self.neutral)


# ============================ 国际赛历史结果（martj42, 免 token）============================
class InternationalResultsSource(MatchDataSource):
    """全量国际赛结果（1872 至今），免授权：

        https://github.com/martj42/international_results  → results.csv

    这是给国家队定 rating 先验的理想广度数据：含友谊赛、各洲预选赛与正赛、中立场标记，
    赛事类型(tournament)直接映射成重要性权重。
    """

    name = "martj42-international-results"
    URL = "https://raw.githubusercontent.com/martj42/international_results/master/results.csv"

    # 赛事 → 重要性权重（FIFA SUM 思路：大赛权重高，友谊赛低）
    _TOURNAMENT_IMPORTANCE = {
        "FIFA World Cup": 1.6,
        "FIFA World Cup qualification": 1.2,
        "UEFA Euro": 1.4,
        "UEFA Euro qualification": 1.1,
        "Copa América": 1.4,
        "African Cup of Nations": 1.3,
        "African Cup of Nations qualification": 1.05,
        "AFC Asian Cup": 1.3,
        "AFC Asian Cup qualification": 1.05,
        "Gold Cup": 1.2,
        "UEFA Nations League": 1.15,
        "CONCACAF Nations League": 1.1,
        "Confederations Cup": 1.2,
        "Friendly": 0.8,
    }

    def __init__(self, since: str = "2014-01-01", *, force_download: bool = False):
        self.since = pd.to_datetime(since)
        self.force_download = force_download
        self._raw: pd.DataFrame | None = None

    @staticmethod
    def parse_csv_text(text: str) -> pd.DataFrame:
        return pd.read_csv(io.StringIO(text))

    def _load_raw(self) -> pd.DataFrame:
        if self._raw is None:
            dest = RAW_DIR / "international_results.csv"
            _download(self.URL, dest, force=self.force_download)
            self._raw = self.parse_csv_text(dest.read_bytes().decode("utf-8"))
        return self._raw

    @classmethod
    def normalize_matches(cls, raw: pd.DataFrame, since: pd.Timestamp | None = None) -> pd.DataFrame:
        neutral_raw = raw["neutral"].astype(str).str.upper().map({"TRUE": True, "FALSE": False})
        df = pd.DataFrame({
            "date": pd.to_datetime(raw["date"], errors="coerce"),
            "home": raw["home_team"],
            "away": raw["away_team"],
            "home_goals": raw["home_score"],
            "away_goals": raw["away_score"],
            "neutral": neutral_raw.fillna(False),
            "importance": raw["tournament"].map(cls._TOURNAMENT_IMPORTANCE).fillna(1.0),
        })
        if since is not None:
            df = df[df["date"] >= since]
        return validate_matches(df)

    def fetch_matches(self) -> pd.DataFrame:
        return self.normalize_matches(self._load_raw(), since=self.since)
