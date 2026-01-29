from google.cloud import storage
import os
from dotenv import load_dotenv

load_dotenv()

def process_file(url: str):
  storage_client = storage.Client()
  bucket_name = os.getenv("GCS_BUCKET_NAME")  
  bucket = storage_client.bucket(bucket_name)
  blob = bucket.blob(url)

  content = blob.download_as_bytes()

  return content
