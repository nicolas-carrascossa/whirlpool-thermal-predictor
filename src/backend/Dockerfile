# Back-end do Thermal Predictor. Contexto de build: RAIZ do repositório,
# porque a API lê os JSONs do dataset que vivem em src/frontend/src/data.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY src/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Código da API e os dados compartilhados com o front (mesmos arquivos).
COPY src/backend/ /app/
# (fora de /data, que é um volume no compose e esconderia o conteúdo copiado)
COPY src/frontend/src/data/ /app/dataset/
COPY contracts/ /contracts/

ENV DATA_DIR=/app/dataset \
    DB_PATH=/data/thermal.db \
    MODEL_MODE=mock

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').status == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
