from google.cloud import storage
from google.cloud.exceptions import NotFound
from python_utils.sqlalchemy_models import Job
from database import SessionLocal
import pandas as pd
import os
import io
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

def save_jobs_to_db(df: pd.DataFrame):
  """Save jobs from DataFrame to database"""
  db = SessionLocal()
  try:
    jobs = []
    for _, row in df.iterrows():
      job = Job(
        job_title=row['job_title'],
        job_description=row['job_description'],
        job_is_active=row.get('job_is_active', True),
        company_name=row['company_name'],
        country=row['country'],
        source_url=row['source_url'],
        apply_link=row['apply_link'],
        source=row['source'],
        updated_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
        # Add other fields as needed from your CSV
      )
      jobs.append(job)
    
    db.bulk_save_objects(jobs)
    db.commit()
    
    return f"Successfully inserted {len(jobs)} jobs"
  except Exception as e:
    db.rollback()
    raise e
  finally:
    db.close()

def process_file(filename: str):
  """Download CSV from GCS and process it"""
  
  # Validate filename
  if not filename or not filename.strip():
    raise ValueError("Filename cannot be empty")
  
  # Ensure it's a CSV file
  if not filename.lower().endswith('.csv'):
    raise ValueError("File must be a CSV file")
  
  try:
    storage_client = storage.Client()
    bucket_name = os.getenv("GCS_BUCKET_NAME")
    
    if not bucket_name:
      raise ValueError("GCS_BUCKET_NAME environment variable not set")
    
    bucket = storage_client.bucket(bucket_name)
    path = f"job-data/{filename}"
    blob = bucket.blob(path)
    
    # Check if blob exists
    if not blob.exists():
      raise FileNotFoundError(f"File '{path}' not found in bucket '{bucket_name}'")
    
    content = blob.download_as_bytes()
    df = pd.read_csv(io.BytesIO(content))
    
    if df.empty:
      raise ValueError("CSV file is empty")
    
    return save_jobs_to_db(df)
    
  except NotFound:
    raise FileNotFoundError(f"Bucket '{bucket_name}' or file '{path}' not found")
  except pd.errors.EmptyDataError:
    raise ValueError("CSV file is empty or invalid")
  except pd.errors.ParserError as e:
    raise ValueError(f"Failed to parse CSV file: {str(e)}")
  except Exception as e:
    raise RuntimeError(f"Failed to process file: {str(e)}")
