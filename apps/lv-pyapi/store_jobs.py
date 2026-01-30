from google.cloud import storage
import os
from dotenv import load_dotenv

load_dotenv()

def process_file(url: str):
  try:
    storage_client = storage.Client()
    bucket_name = os.getenv("GCS_BUCKET_NAME")  
    bucket = storage_client.bucket(bucket_name)
    blob_path = "job-data/jobs-20260117-total-3.csv"
    
    blob = bucket.blob(blob_path)
    content = blob.download_as_bytes()
    
    return content 
  except Exception as e:
    raise e
