# Build context is apps/lv-pyapi/agents/ (used by the LiveKit deploy action)
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent source files (build context is agents/ directory)
COPY agent.py .
COPY helper.py .
COPY tasks.py .
COPY langsmith_processor.py .
COPY faq.py .
COPY faq_data.json .

# Run the agent
CMD ["python", "agent.py"]
