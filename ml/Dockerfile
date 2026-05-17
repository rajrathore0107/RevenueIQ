# Pin Python 3.11.9 — pandas 2.2.x, numpy 1.26.x, and prophet 1.1.5
# are NOT compatible with Python 3.14 (Render's current default).
FROM python:3.11.9-slim

# System deps needed to compile prophet / pystan
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer-cached unless requirements change)
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r requirements.txt

# Copy application code
COPY . .

# Render injects $PORT at runtime
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
