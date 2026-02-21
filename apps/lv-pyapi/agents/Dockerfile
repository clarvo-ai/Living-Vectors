# Build context must be the repo root: docker build -f apps/lv-pyapi/agents/Dockerfile .
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install agent-specific dependencies
COPY apps/lv-pyapi/agents/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the agent and the tasks module it imports from the pyapi root
COPY apps/lv-pyapi/agents/agent.py ./agents/agent.py
COPY apps/lv-pyapi/tasks.py ./tasks.py

# Make the pyapi root (tasks.py) importable
ENV PYTHONPATH=/app

# Run the agent
CMD ["python", "agents/agent.py"]