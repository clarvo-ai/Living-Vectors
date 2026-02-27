from google.cloud import storage
from google.cloud.exceptions import NotFound
from python_utils.sqlalchemy_models import Job
from sqlalchemy.dialects.postgresql import insert
from database import SessionLocal
import pandas as pd
import os
import io
from dotenv import load_dotenv
from datetime import datetime
import uuid
import csv

load_dotenv()

def parse_lists(value):
  """Helper function to parse list-like strings from CSV"""
  if pd.isna(value):
    return []
  if isinstance(value, str):
    # Remove PostgreSQL array curly braces if present
    value = value.strip()
    if value.startswith('{') and value.endswith('}'):
      value = value[1:-1]
    
    # Parse using csv reader which handles quotes properly
    reader = csv.reader([value], delimiter=',', quotechar='"')
    items = []
    for row in reader:
      items.extend([item.strip() for item in row if item.strip()])
    return items
  if isinstance(value, list):
    return value
  return []

def parse_uuid(value):
  if pd.isna(value):
    return None
  if isinstance(value, str):
    return uuid.UUID(value)
  return None

def parse_timestamp(value):
  if pd.isna(value):
    return None
  if isinstance(value, str):
    return datetime.fromisoformat(value)
  return None

def parse_int(value):
  if pd.isna(value):
    return None
  try:
    return int(value)
  except (ValueError, TypeError):
    return None

def parse_string(value):
  """Helper function to parse string values and convert NaN to None"""
  if pd.isna(value):
    return None
  return str(value) if value else None

def parse_float(value):
  """Helper function to parse float values and convert NaN to None"""
  if pd.isna(value):
    return None
  try:
    return float(value)
  except (ValueError, TypeError):
    return None

def parse_bool(value):
  """Helper function to parse boolean values"""
  if pd.isna(value):
    return False  # Default to False for boolean fields
  if isinstance(value, bool):
    return value
  if isinstance(value, str):
    return value.lower() in ('true', '1', 'yes', 't')
  return bool(value)

def save_jobs_to_db(df: pd.DataFrame):
  """Save jobs from DataFrame to database"""
  db = SessionLocal()
  try:
    inserted_count = 0
    total_count = 0
    
    for _, row in df.iterrows():
      job_dict = {
        'id': parse_uuid(row.get('id')),
        'titleId': parse_uuid(row.get('titleId')),
        'external_id': parse_string(row.get("external_id")),
        'company_name': parse_string(row.get('company_name')),
        'company_description': parse_string(row.get('company_description')),
        'company_industry': parse_string(row.get('company_industry')),
        'company_revenue': parse_string(row.get('company_revenue')),
        'company_size': parse_string(row.get('company_size')),
        'company_culture': parse_string(row.get('company_culture')),
        'company_values': parse_lists(row.get('company_values')),
        'organizationId': parse_uuid(row.get('organizationId')),
        'job_title': parse_string(row.get('job_title')),
        'job_description': parse_string(row.get('job_description')),
        'job_description_summary': parse_string(row.get('job_description_summary')),
        'job_is_active': parse_bool(row.get('job_is_active')),
        'job_level': parse_string(row.get('job_level')),
        'job_starting_date': parse_timestamp(row.get('job_starting_date')),
        'role_industry': parse_string(row.get('role_industry')),
        'employment_type': parse_string(row.get('employment_type')),
        'contract_type': parse_string(row.get('contract_type')),
        'working_mode': parse_string(row.get('working_mode')),
        'summer_job_internship': parse_bool(row.get('summer_job_internship')),
        'country': parse_string(row.get('country')),
        'city': parse_string(row.get('city')),
        'longitude': parse_float(row.get('longitude')),
        'latitude': parse_float(row.get('latitude')),
        'published_date': parse_timestamp(row.get('published_date')),
        'last_day_to_apply': parse_timestamp(row.get('last_day_to_apply')),
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
        'required_skills': parse_lists(row.get('required_skills')),
        'nice_to_have_skills': parse_lists(row.get('nice_to_have_skills')),
        'required_languages': parse_lists(row.get('required_languages')),
        'nice_to_have_languages': parse_lists(row.get('nice_to_have_languages')),
        'language_summary': parse_string(row.get('language_summary')),
        'requirements': parse_lists(row.get('requirements')),
        'required_education': parse_lists(row.get('required_education')),
        'required_experience_months': parse_int(row.get('required_experience_months')),
        'salary_min': parse_float(row.get('salary_min')),
        'salary_max': parse_float(row.get('salary_max')),
        'salary': parse_float(row.get('salary')),
        'guessed_salary': parse_float(row.get('guessed_salary')),
        'guessed_salary_min': parse_float(row.get('guessed_salary_min')),
        'guessed_salary_max': parse_float(row.get('guessed_salary_max')),
        'bonus': parse_float(row.get('bonus')),
        'guessed_bonus': parse_float(row.get('guessed_bonus')),
        'commission': parse_float(row.get('commission')),
        'guessed_commission': parse_float(row.get('guessed_commission')),
        'work_hours': parse_float(row.get('work_hours')),
        'work_hours_min': parse_float(row.get('work_hours_min')),
        'work_hours_max': parse_float(row.get('work_hours_max')),
        'work_hours_summary': parse_string(row.get('work_hours_summary')),
        'source_url': parse_string(row.get('source_url')),
        'apply_link': parse_string(row.get('apply_link')),
        'application_instructions': parse_string(row.get('application_instructions')),
        'source': parse_string(row.get('source')),
        'sub_source': parse_string(row.get('sub_source')),
        'recruiter_name': parse_string(row.get('recruiter_name')),
        'recruiter_email': parse_string(row.get('recruiter_email')),
        'recruiter_phone': parse_string(row.get('recruiter_phone')),
        'career_advancement_details': parse_string(row.get('career_advancement_details')),
        'deprecated_perks': parse_lists(row.get('deprecated_perks')),
        'deprecated_keywords': parse_lists(row.get('deprecated_keywords')),
        'job_embedding': None,
        'job_title_embedding': None,
        'original_text': parse_string(row.get('original_text')),
        'version': parse_float(row.get('version')),
      }
      
      stmt = insert(Job).values(**job_dict).on_conflict_do_nothing(index_elements=['id'])
      
      result = db.execute(stmt)
      
      total_count += 1
      if result.rowcount > 0:
        inserted_count += 1
    
    db.commit()
    
    if inserted_count == 0:
      return f"Successfully read but only found duplicates"
    
    return f"Successfully inserted {inserted_count} jobs (skipped {total_count - inserted_count} duplicates)"
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
    raise FileNotFoundError(f"File '{path}' not found")
  except pd.errors.EmptyDataError:
    raise ValueError("CSV file is empty or invalid")
  except pd.errors.ParserError as e:
    raise ValueError(f"Failed to parse CSV file: {str(e)}")
  except Exception as e:
    raise RuntimeError(f"Failed to process file: {str(e)}")
