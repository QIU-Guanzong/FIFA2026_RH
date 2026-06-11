"""推理服务的请求/响应模型（pydantic v2）。"""
from __future__ import annotations

from pydantic import BaseModel, Field


class MatchRequest(BaseModel):
    home: str = Field(..., description="主队（中立场时仅为标签）")
    away: str
    neutral: bool = True


class TopScore(BaseModel):
    score: str          # "x:y"
    prob: float


class MatchPrediction(BaseModel):
    home: str
    away: str
    neutral: bool
    lambda_home: float
    lambda_away: float
    prob_home: float
    prob_draw: float
    prob_away: float
    over_2_5: float
    under_2_5: float
    btts_yes: float
    top_scores: list[TopScore]
    xg_home: float
    xg_away: float


class TeamProb(BaseModel):
    team: str
    advance: float
    reach_qf: float
    reach_sf: float
    reach_final: float
    champion: float


class TournamentResponse(BaseModel):
    n_sims: int
    seed: int
    teams: list[TeamProb]


class RankingEntry(BaseModel):
    rank: int
    team: str
    strength: float


class RankingsResponse(BaseModel):
    model_name: str
    version: int
    n_teams: int
    teams: list[RankingEntry]


class HealthResponse(BaseModel):
    status: str
    model_name: str
    version: int
    n_teams: int
    metadata: dict


class PortalMeta(BaseModel):
    generated_at: str
    model_name: str
    version: int
    n_teams: int
    metadata: dict


class PortalOddsEntry(BaseModel):
    team: str
    model: float
    market: float | None = None
    edge: float | None = None


class PortalResponse(BaseModel):
    meta: PortalMeta
    rankings: RankingsResponse
    tournament: TournamentResponse
    featured_matches: list[MatchPrediction]
    odds_cmp: list[PortalOddsEntry]
    bracket: dict | None = None
