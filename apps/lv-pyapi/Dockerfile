FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (requires root)
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies (requires root)
COPY apps/lv-pyapi/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Create a non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Copy the application code
COPY --chown=appuser:appuser apps/lv-pyapi/ /app/apps/lv-pyapi/
COPY --chown=appuser:appuser packages/python-utils/ /app/packages/python-utils/
COPY --chown=appuser:appuser packages/shared-data/ /app/packages/shared-data/

# Switch to non-root user
USER appuser

# Set the working directory to the app
WORKDIR /app/apps/lv-pyapi

# Set Python path to include the packages
ENV PYTHONPATH=/app:/app/packages/python-utils/src

# Expose the port
EXPOSE 8080

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]