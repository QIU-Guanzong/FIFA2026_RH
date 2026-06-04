# wcpredict 推理服务镜像（#3 部署层）
FROM python:3.12-slim

WORKDIR /app

# 依赖层：只随 requirements.txt 变化而失效（代码改动不触发重装科学栈）
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 包代码层：代码改动只重跑这步（--no-deps，秒级）
COPY pyproject.toml ./
COPY src ./src
RUN pip install --no-cache-dir --no-deps .

# 关键：pip 安装后包在 site-packages，必须用环境变量把数据/模型目录指到 /app，否则挂卷失效
ENV WCPREDICT_DATA_DIR=/app/data \
    WCPREDICT_ARTIFACTS_DIR=/app/artifacts
RUN mkdir -p /app/artifacts /app/data

EXPOSE 8000

# 默认起 FastAPI 服务；也可 `docker run ... python -m wcpredict.cli train` 先训练
CMD ["python", "-m", "wcpredict.cli", "serve", "--host", "0.0.0.0", "--port", "8000"]
