FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the agent file
COPY ./agent.py .

# Expose port (optional, for health checks)
EXPOSE 8080

# Run the agent
CMD ["python", "agent.py"]