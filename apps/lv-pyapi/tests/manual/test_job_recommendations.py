"""
Quick test script to verify job recommendations are working.
Run this to test saving and retrieving job recommendations.

Usage (from repo root):
    docker compose run --rm lv-pyapi python tests/manual/test_job_recommendations.py
"""

import sys
import os
from uuid import uuid4

# Add apps/lv-pyapi to path so database, job_recommendations etc. are importable
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

from database import SessionLocal
from job_recommendations import save_job_recommendations, get_job_recommendations
from python_utils.sqlalchemy_models import User, JobRecommendation
from sqlalchemy import select

def test_job_recommendations():
    """Test saving and retrieving job recommendations"""
    db = SessionLocal()
    
    try:
        # Step 1: Get or create a test user
        print("Step 1: Finding a test user...")
        stmt = select(User).limit(1)
        result = db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            print("No users found in database. Please create a user first.")
            print("You can sign up via the web app or create one manually.")
            return
        
        user_id = str(user.id)
        print(f"Using user: {user.email} (ID: {user_id})")
        
        # Step 2: Save some test recommendations
        print("\nStep 2: Saving test job recommendations...")
        test_recommendations = [
            {"job_id": "job-123", "score": 0.95},
            {"job_id": "job-456", "score": 0.87},
            {"job_id": "job-789", "score": 0.82},
            {"job_id": "job-abc", "score": 0.75},
        ]
        
        count = save_job_recommendations(db, user_id, test_recommendations)
        print(f"Saved {count} job recommendations!")
        
        # Step 3: Retrieve and display them
        print("\nStep 3: Retrieving job recommendations...")
        recommendations = get_job_recommendations(db, user_id)
        
        print(f"\nFound {len(recommendations)} recommendations for {user.email}:")
        print("-" * 80)
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. Job ID: {rec['job_id']}")
            print(f"   Score: {rec['score']}")
            print(f"   Timestamp: {rec['timestamp']}")
            print(f"   Created: {rec['created_at']}")
            print()
        
        # Step 4: Verify in database directly
        print("Step 4: Verifying in database...")
        stmt = select(JobRecommendation).where(JobRecommendation.userId == user.id)
        result = db.execute(stmt)
        db_recs = result.scalars().all()
        print(f"Database contains {len(db_recs)} JobRecommendation records")
        
        print("\nAll tests passed! Job recommendations are working!")
        
    except Exception as e:
        print(f"\nError: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_job_recommendations()

