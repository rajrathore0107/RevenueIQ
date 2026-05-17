FROM python:3.11.9-slim

# System deps needed for Prophet's cmdstan backend
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r requirements.txt

# Explicitly install the CmdStan C++ backend that Prophet needs.
# Without this, Prophet throws: 'Prophet' object has no attribute 'stan_backend'
RUN python -m cmdstanpy.install_cmdstan

# Copy application code
COPY . .

EXPOSE 8000

# Render injects $PORT at runtime
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
