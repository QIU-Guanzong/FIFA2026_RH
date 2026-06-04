"""特征层：用 DuckDB 直接查询 Parquet 原始数据（in-process，无需建库）。

DuckDB 为可选依赖；未安装时回退到 pandas，保证分析主干不被部署层卡住。
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd


def team_form_table(parquet_path: str | Path) -> pd.DataFrame:
    """从比赛历史 Parquet 聚合每队的简单进攻/防守表现（特征雏形）。

    输出列：team, matches, goals_for_pg, goals_against_pg, points_pg。
    优先用 DuckDB SQL 查 Parquet；缺库则用 pandas 等价实现。
    """
    parquet_path = str(parquet_path)
    try:
        import duckdb  # noqa: PLC0415
    except ImportError:
        return _team_form_pandas(parquet_path)

    sql = f"""
    WITH long AS (
        SELECT home AS team, home_goals AS gf, away_goals AS ga,
               CASE WHEN home_goals>away_goals THEN 3
                    WHEN home_goals=away_goals THEN 1 ELSE 0 END AS pts
        FROM read_parquet('{parquet_path}')
        UNION ALL
        SELECT away AS team, away_goals AS gf, home_goals AS ga,
               CASE WHEN away_goals>home_goals THEN 3
                    WHEN away_goals=home_goals THEN 1 ELSE 0 END AS pts
        FROM read_parquet('{parquet_path}')
    )
    SELECT team,
           COUNT(*)            AS matches,
           AVG(gf)             AS goals_for_pg,
           AVG(ga)             AS goals_against_pg,
           AVG(pts)            AS points_pg
    FROM long
    GROUP BY team
    ORDER BY points_pg DESC
    """
    return duckdb.query(sql).to_df()


def _team_form_pandas(parquet_path: str) -> pd.DataFrame:
    df = pd.read_parquet(parquet_path)
    home = pd.DataFrame({
        "team": df["home"], "gf": df["home_goals"], "ga": df["away_goals"],
        "pts": (df["home_goals"] > df["away_goals"]) * 3 + (df["home_goals"] == df["away_goals"]) * 1,
    })
    away = pd.DataFrame({
        "team": df["away"], "gf": df["away_goals"], "ga": df["home_goals"],
        "pts": (df["away_goals"] > df["home_goals"]) * 3 + (df["away_goals"] == df["home_goals"]) * 1,
    })
    long = pd.concat([home, away], ignore_index=True)
    out = long.groupby("team").agg(
        matches=("gf", "size"),
        goals_for_pg=("gf", "mean"),
        goals_against_pg=("ga", "mean"),
        points_pg=("pts", "mean"),
    ).reset_index().sort_values("points_pg", ascending=False)
    return out
