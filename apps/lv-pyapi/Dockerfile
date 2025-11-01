FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY apps/lv-pyapi/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY apps/lv-pyapi/ /app/apps/lv-pyapi/
COPY packages/python-utils/ /app/packages/python-utils/

# Set the working directory to the app
WORKDIR /app/apps/lv-pyapi

# Set Python path to include the packages
ENV PYTHONPATH=/app:/app/packages/python-utils/src

# Expose the port
EXPOSE 8000

# Run the application
#CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]