PY := ./.venv/bin/python

.PHONY: setup test demo demo-fit clean train-wc2026 upgrade-loop upgrade-daemon start-upgrade stop-upgrade

setup:  ## 创建 venv 并安装依赖
	/opt/homebrew/bin/python3.12 -m venv .venv
	$(PY) -m pip install -U pip
	$(PY) -m pip install -e ".[dev,features]"

test:  ## 跑全部正确性测试
	$(PY) -m pytest -q

demo:  ## 端到端 demo（rating 先验路径，5 万届模拟）
	$(PY) -m wcpredict.cli demo --sims 50000

demo-fit:  ## 端到端 demo（MLE 拟合路径）
	$(PY) -m wcpredict.cli demo --sims 50000 --fit-dc

clean:  ## 清理生成物
	rm -rf data/*.parquet artifacts/ .pytest_cache **/__pycache__

train-wc2026:  ## 训练 wc2026 官方模型 + 重建展示页（单次）
	$(PY) -m wcpredict.cli train --model wc2026 --name default --since 2006-01-01
	$(PY) scripts/refresh_wc2026_site.py --model default

upgrade-loop:  ## 4 小时一轮：训练->重建->部署（持续）。加 --once 只跑一轮
	bash scripts/run_wc2026_upgrade_loop.sh

upgrade-daemon:  ## 后台持续循环（适合你睡觉时离线跑）
	bash scripts/start_wc2026_upgrade_daemon.sh

start-upgrade:  ## 上面同名别名
	$(MAKE) upgrade-daemon

stop-upgrade:  ## 停止后台循环
	bash scripts/stop_wc2026_upgrade_daemon.sh
