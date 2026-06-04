"""StatsBomb 开放事件数据源（免授权）：抽取射门级样本用于自建 shot-level xG。

  https://github.com/statsbomb/open-data
默认 FIFA World Cup 2022（competition_id=43, season_id=106）。事件文件按 match 缓存到
data/raw/statsbomb/，解析与下载分离便于离线单测。许可：公开研究须注明数据来源（StatsBomb）。
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
import json

import pandas as pd

from wcpredict.data.sources import RAW_DIR, _download

_SB_BASE = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"
_SB_DIR = RAW_DIR / "statsbomb"


class StatsBombSource:
    def __init__(self, competition_id: int = 43, season_id: int = 106, *, force_download: bool = False):
        self.competition_id = competition_id
        self.season_id = season_id
        self.force_download = force_download

    def _fetch_json(self, url: str, dest_name: str):
        dest = _SB_DIR / dest_name
        _download(url, dest, force=self.force_download, timeout=60)
        return json.loads(dest.read_bytes().decode("utf-8"))

    def _fetch_events_many(
        self,
        match_ids: list[int],
        *,
        max_workers: int = 8,
    ) -> tuple[dict[int, list[dict]], dict[int, Exception]]:
        """并行拉取事件文件，返回成功事件与失败异常；解析顺序由调用方按 match_ids 保持。"""
        events_by_match: dict[int, list[dict]] = {}
        failures: dict[int, Exception] = {}
        if not match_ids:
            return events_by_match, failures

        def fetch_one(mid: int) -> list[dict]:
            return self._fetch_json(f"{_SB_BASE}/events/{mid}.json", f"events_{mid}.json")

        workers = max(1, min(int(max_workers), len(match_ids)))
        if workers == 1:
            for mid in match_ids:
                try:
                    events_by_match[mid] = fetch_one(mid)
                except Exception as e:  # noqa: BLE001
                    failures[mid] = e
            return events_by_match, failures

        with ThreadPoolExecutor(max_workers=workers) as ex:
            futures = {ex.submit(fetch_one, mid): mid for mid in match_ids}
            for fut in as_completed(futures):
                mid = futures[fut]
                try:
                    events_by_match[mid] = fut.result()
                except Exception as e:  # noqa: BLE001
                    failures[mid] = e
        return events_by_match, failures

    def matches(self) -> list[dict]:
        url = f"{_SB_BASE}/matches/{self.competition_id}/{self.season_id}.json"
        return self._fetch_json(url, f"matches_{self.competition_id}_{self.season_id}.json")

    @staticmethod
    def parse_shots(events: list[dict], match_id=None) -> list[dict]:
        """从一场比赛的事件列表抽取所有射门为结构化行。"""
        rows = []
        for e in events:
            if (e.get("type") or {}).get("name") != "Shot":
                continue
            sh = e.get("shot") or {}
            loc = e.get("location") or [None, None]
            rows.append({
                "match_id": match_id,
                "team": (e.get("team") or {}).get("name"),
                "player": (e.get("player") or {}).get("name"),
                "period": e.get("period"),     # 5 = 点球大战（非比赛内 xG 过程）
                "x": loc[0],
                "y": loc[1],
                "goal": (sh.get("outcome") or {}).get("name") == "Goal",
                "body_part": (sh.get("body_part") or {}).get("name"),
                "shot_type": (sh.get("type") or {}).get("name"),
                "statsbomb_xg": sh.get("statsbomb_xg"),
                "play_pattern": (e.get("play_pattern") or {}).get("name"),
                "under_pressure": bool(e.get("under_pressure", False)),
            })
        return rows

    @staticmethod
    def parse_lineups(events: list[dict], match_id=None) -> list[dict]:
        """从事件列表抽取两队首发 XI（Starting XI 事件的 tactics.lineup）。"""
        rows = []
        for e in events:
            if (e.get("type") or {}).get("name") != "Starting XI":
                continue
            team = (e.get("team") or {}).get("name")
            for p in ((e.get("tactics") or {}).get("lineup") or []):
                rows.append({
                    "match_id": match_id,
                    "team": team,
                    "player": (p.get("player") or {}).get("name"),
                    "position": (p.get("position") or {}).get("name"),
                    "jersey": p.get("jersey_number"),
                })
        return rows

    def lineups(self, max_matches: int | None = None, *, max_workers: int = 8) -> pd.DataFrame:
        """拉取该赛事所有比赛的首发 XI（复用按 match 缓存的事件文件）。"""
        matches = self.matches()
        if max_matches:
            matches = matches[:max_matches]
        rows: list[dict] = []
        match_ids = [int(m["match_id"]) for m in matches]
        events_by_match, failures = self._fetch_events_many(match_ids, max_workers=max_workers)
        for m in matches:
            mid = int(m["match_id"])
            events = events_by_match.get(mid)
            if events is None:
                print(f"  [警告] 跳过 match {mid} 首发（重试后仍失败）：{failures.get(mid)}")
                continue
            rows.extend(self.parse_lineups(events, match_id=mid))
        return pd.DataFrame(rows)

    def shots(
        self,
        max_matches: int | None = None,
        *,
        include_shootouts: bool = False,
        max_workers: int = 8,
    ) -> pd.DataFrame:
        """拉取该赛事所有比赛的射门样本（按 match 缓存事件文件）。

        单场事件文件经 _download 有界重试后仍失败时，大声告警并跳过该场（不静默截断），
        让一两个抖动文件不至于拖垮整批研究数据拉取。

        默认排除点球大战射门（period==5）：那是平局的独立点球决胜过程，转化率约 0.63，
        既非比赛内 xG，也不该按比赛内点球常数计；保留比赛内点球（period 1–4）。
        """
        matches = self.matches()
        if max_matches:
            matches = matches[:max_matches]
        all_rows: list[dict] = []
        match_ids = [int(m["match_id"]) for m in matches]
        events_by_match, failures = self._fetch_events_many(match_ids, max_workers=max_workers)
        skipped = sorted(failures)
        for m in matches:
            mid = int(m["match_id"])
            events = events_by_match.get(mid)
            if events is None:
                print(f"  [警告] 跳过 match {mid}（重试后仍失败）：{failures.get(mid)}")
                continue
            all_rows.extend(self.parse_shots(events, match_id=mid))
        if skipped:
            print(f"  [警告] 共跳过 {len(skipped)}/{len(matches)} 场（缺这些场的射门）：{skipped}")
        df = pd.DataFrame(all_rows)
        if not df.empty and not include_shootouts and "period" in df.columns:
            n_so = int((df["period"] == 5).sum())
            if n_so:
                print(f"  排除点球大战射门 {n_so} 个（period 5，独立点球决胜，非比赛内 xG 过程）")
            df = df[df["period"] != 5]
        # 丢弃无坐标的异常行
        return df.dropna(subset=["x", "y"]).reset_index(drop=True)
