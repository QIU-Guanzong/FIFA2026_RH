PY := ./.venv/bin/python

.PHONY: setup test demo demo-fit clean

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
