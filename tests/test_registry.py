"""模型仓：保存/载入往返 + 版本管理。"""
import numpy as np
import pytest

from wcpredict.data.synthetic import generate_true_params
from wcpredict.registry import ModelStore


def test_save_load_roundtrip(tmp_path):
    store = ModelStore(root=tmp_path)
    params = generate_true_params(n_teams=10, seed=1)
    v = store.save(params, name="m", metadata={"source": "test"})
    assert v == 1
    loaded = store.load("m")
    assert loaded.version == 1
    assert loaded.metadata["source"] == "test"
    assert loaded.params.teams == params.teams
    assert np.allclose(loaded.params.attack, params.attack)
    assert np.allclose(loaded.params.defence, params.defence)
    assert loaded.params.rho == pytest.approx(params.rho)
    assert loaded.params.intercept == pytest.approx(params.intercept)


def test_versioning(tmp_path):
    store = ModelStore(root=tmp_path)
    p = generate_true_params(n_teams=6, seed=2)
    assert store.latest_version("d") is None
    assert store.save(p, name="d") == 1
    assert store.save(p, name="d") == 2
    assert store.latest_version("d") == 2
    assert store.list_versions("d") == [1, 2]
    # 不指定版本 → 取 latest
    assert store.load("d").version == 2
    # 指定旧版本
    assert store.load("d", version=1).version == 1


def test_load_missing_raises(tmp_path):
    store = ModelStore(root=tmp_path)
    with pytest.raises(FileNotFoundError):
        store.load("nonexistent")
