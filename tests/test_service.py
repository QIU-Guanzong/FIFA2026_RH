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
    r = client.get("/tournament?sims=1500&top=10")
    assert r.status_code == 200
    b = r.json()
    assert b["n_sims"] == 1500
    assert len(b["teams"]) == 10
    for t in b["teams"]:
        assert 0.0 <= t["champion"] <= t["advance"] <= 1.0    # 嵌套单调
