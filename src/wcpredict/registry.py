"""模型仓：本地文件系统 + metadata JSON（文档建议的第一版版本管理）。

每个模型版本一个 JSON：含 DC 参数 + 元数据（来源、cutoff、拟合时间、样本量、指标）。
按 name 维护自增版本号与 latest 指针。后续需要多版本/多 cutoff 再换 MLflow Registry。
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from wcpredict.config import ARTIFACTS_DIR
from wcpredict.model.dixon_coles import DixonColesParams


def params_to_dict(p: DixonColesParams) -> dict:
    return {
        "teams": list(p.teams),
        "attack": [float(x) for x in p.attack],
        "defence": [float(x) for x in p.defence],
        "intercept": float(p.intercept),
        "home_adv": float(p.home_adv),
        "rho": float(p.rho),
    }


def params_from_dict(d: dict) -> DixonColesParams:
    return DixonColesParams(
        teams=list(d["teams"]),
        attack=np.array(d["attack"], dtype=float),
        defence=np.array(d["defence"], dtype=float),
        intercept=float(d["intercept"]),
        home_adv=float(d["home_adv"]),
        rho=float(d["rho"]),
    )


@dataclass
class LoadedModel:
    params: DixonColesParams
    metadata: dict
    name: str
    version: int


class ModelStore:
    def __init__(self, root: Path | str | None = None):
        self.root = Path(root) if root else (ARTIFACTS_DIR / "models")

    def _dir(self, name: str) -> Path:
        return self.root / name

    def latest_version(self, name: str = "default") -> int | None:
        d = self._dir(name)
        if not d.exists():
            return None
        versions = [int(p.stem[1:]) for p in d.glob("v*.json") if p.stem[1:].isdigit()]
        return max(versions) if versions else None

    def list_versions(self, name: str = "default") -> list[int]:
        d = self._dir(name)
        if not d.exists():
            return []
        return sorted(int(p.stem[1:]) for p in d.glob("v*.json") if p.stem[1:].isdigit())

    def save(self, params: DixonColesParams, *, name: str = "default", metadata: dict | None = None) -> int:
        d = self._dir(name)
        d.mkdir(parents=True, exist_ok=True)
        version = (self.latest_version(name) or 0) + 1
        payload = {
            "name": name,
            "version": version,
            "params": params_to_dict(params),
            "metadata": metadata or {},
        }
        (d / f"v{version}.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        return version

    def load(self, name: str = "default", version: int | None = None) -> LoadedModel:
        if version is None:
            version = self.latest_version(name)
        if version is None:
            raise FileNotFoundError(f"模型仓中没有 '{name}' 的任何版本")
        path = self._dir(name) / f"v{version}.json"
        if not path.exists():
            raise FileNotFoundError(f"找不到模型 {name} v{version}")
        payload = json.loads(path.read_text(encoding="utf-8"))
        return LoadedModel(
            params=params_from_dict(payload["params"]),
            metadata=payload.get("metadata", {}),
            name=name,
            version=version,
        )
