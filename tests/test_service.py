"""FastAPI 推理服务：用 TestClient 打各端点（不触网，靠合成兜底模型）。"""
import pytest
from fastapi.testclient import TestClient

import wcpredict.registry as registry
from wcpredict.service.app import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    # 把模型仓指到临时目录 → lifespan 找不到模型会自动落合成 48 队兜底模型
    monkeypatch.setattr(registry, "ARTIFACTS_DIR", tmp_path)
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["n_teams"] == 48
    assert body["version"] >= 1


def test_rankings_sorted(client):
    r = client.get("/rankings?top=5")
    assert r.status_code == 200
    teams = r.json()["teams"]
    assert len(teams) == 5
    strengths = [t["strength"] for t in teams]
    assert strengths == sorted(strengths, reverse=True)
    assert teams[0]["rank"] == 1


def test_rankings_top_is_clamped(client):
    r = client.get("/rankings?top=999")
    assert r.status_code == 200
    b = r.json()
    assert b["n_teams"] == 48
    assert len(b["teams"]) == 48


def test_predict_match(client):
    r = client.post("/predict", json={"home": "T01", "away": "T02", "neutral": True})
    assert r.status_code == 200
    b = r.json()
    assert b["prob_home"] + b["prob_draw"] + b["prob_away"] == pytest.approx(1.0, abs=1e-6)
    assert b["lambda_home"] > 0 and b["lambda_away"] > 0
    assert len(b["top_scores"]) == 5
    assert b["top_scores"][0]["prob"] >= b["top_scores"][1]["prob"]   # 已排序


def test_predict_unknown_team(client):
    r = client.post("/predict", json={"home": "Atlantis", "away": "T02"})
    assert r.status_code == 404


def test_reload(client):
    r = client.post("/reload")
    assert r.status_code == 200
    b = r.json()
    assert b["status"] == "reloaded"
    assert b["n_teams"] == 48
    assert b["version"] >= 1


def test_tournament(client):
    r = client.get("/tournament?sims=1500&top=10&seed=99")
    assert r.status_code == 200
    b = r.json()
    assert b["n_sims"] == 1500
    assert b["seed"] == 99
    assert len(b["teams"]) == 10
    for t in b["teams"]:
        assert 0.0 <= t["champion"] <= t["advance"] <= 1.0    # 嵌套单调


def test_tournament_bounds_and_seed_cache(client):
    r1 = client.get("/tournament?sims=0&top=999&seed=1")
    r2 = client.get("/tournament?sims=0&top=999&seed=2")
    assert r1.status_code == 200 and r2.status_code == 200
    b1, b2 = r1.json(), r2.json()
    assert b1["n_sims"] == 1
    assert b1["seed"] == 1 and b2["seed"] == 2
    assert len(b1["teams"]) == 48
    # 两个 seed 应分别缓存，不应因为同 sims 复用同一结果对象。
    version = client.app.state.loaded.version
    assert (version, 1, 1) in client.app.state.tournament_cache
    assert (version, 1, 2) in client.app.state.tournament_cache
