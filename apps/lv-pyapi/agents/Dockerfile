# Build context is apps/lv-pyapi/agents/ (used by the LiveKit deploy action)
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install agent-specific dependencies
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the agent and its task definitions
COPY agent.py ./agents/agent.py
COPY tasks.py ./tasks.py

# Make the pyapi root (tasks.py) importable
ENV PYTHONPATH=/app

# Run the agent
CMD ["python", "agents/agent.py"]