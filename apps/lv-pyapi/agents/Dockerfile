# Build context is apps/lv-pyapi/agents/ (used by the LiveKit deploy action)
# Before this Dockerfile runs, the CI workflow copies these into agents/:
#   - database.py       (from apps/lv-pyapi/)
#   - gemini_client.py  (from apps/lv-pyapi/)
#   - python_utils/     (from packages/python-utils/src/python_utils/)
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared modules (injected by CI — see agent-deployment.yml)
COPY database.py ./database.py
COPY gemini_client.py ./gemini_client.py
COPY python_utils/ ./python_utils/

# Copy agent source files
COPY agent.py ./agents/agent.py
COPY tasks.py ./agents/tasks.py
COPY learnings.py ./agents/learnings.py

# /app is the root — database.py, gemini_client.py, python_utils/ and agents/ are all importable
ENV PYTHONPATH=/app

# Run the agent
CMD ["python", "agents/agent.py"]