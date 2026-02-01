#!/usr/bin/env python3
"""
Manual test script for vector embeddings and job matching.

Run this script to verify the embedding and job matching features work correctly.

Usage:
    python test_embeddings_and_matching.py

Requirements:
    - lv-db container running on localhost:3772
    - lv-pyapi running on localhost:8091
"""

import requests
import json
import sys
from datetime import datetime

API_URL = "http://localhost:8091"
DB_CONTAINER = "lv-db"

# Test user ID (mohammad.asender95@gmail.com)
TEST_USER_ID = "f2c28dc9-f7a3-41c3-80a3-fc4051cd5a43"


def print_header(text: str):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}\n")


def print_success(text: str):
    print(f"✅ {text}")


def print_error(text: str):
    print(f"❌ {text}")


def print_info(text: str):
    print(f"ℹ️  {text}")


def cleanup_test_jobs():
    """Remove test jobs created by this script."""
    print_header("CLEANUP: Removing Test Jobs")
    import subprocess
    try:
        result = subprocess.run(
            ["docker", "exec", "lv-db", "psql", "-U", "postgres", "-d", "postgres", "-c",
             "DELETE FROM \"Job\" WHERE company = 'TestCorp';"],
            capture_output=True, text=True, timeout=10
        )
        if "DELETE" in result.stdout:
            count = result.stdout.strip().split()[-1] if result.stdout else "0"
            print_success(f"Cleaned up test jobs")
        return True
    except Exception as e:
        print_error(f"Failed to cleanup: {e}")
        return False


def test_api_health():
    """Test that the API is running."""
    print_header("TEST 1: API Health Check")
    try:
        resp = requests.get(f"{API_URL}/health", timeout=5)
        if resp.status_code == 200 and resp.json().get("status") == "healthy":
            print_success("API is healthy")
            return True
        else:
            print_error(f"API returned unexpected response: {resp.text}")
            return False
    except Exception as e:
        print_error(f"API not reachable: {e}")
        return False


def test_create_jobs():
    """Test creating jobs with embeddings."""
    print_header("TEST 2: Create Jobs with Embeddings")
    
    test_jobs = [
        {
            "title": "Test Frontend Developer",
            "company": "TestCorp",
            "description": "Frontend developer with React, TypeScript, and CSS skills. Work with designers to build beautiful UIs.",
            "location": "Remote"
        },
        {
            "title": "Test Backend Engineer", 
            "company": "TestCorp",
            "description": "Backend engineer with Python, PostgreSQL, and API design. Build scalable microservices.",
            "location": "On-site"
        },
        {
            "title": "Test DevOps Engineer",
            "company": "TestCorp", 
            "description": "DevOps engineer managing Kubernetes, Docker, and CI/CD pipelines.",
            "location": "Hybrid"
        }
    ]
    
    created_jobs = []
    for job in test_jobs:
        try:
            resp = requests.post(f"{API_URL}/api/jobs", json=job, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                print_success(f"Created: {job['title']} (ID: {data.get('job_id', 'N/A')[:8]}...)")
                created_jobs.append(data.get('job_id'))
            else:
                print_error(f"Failed to create {job['title']}: {resp.text}")
        except Exception as e:
            print_error(f"Error creating {job['title']}: {e}")
    
    print_info(f"Created {len(created_jobs)}/{len(test_jobs)} jobs")
    return len(created_jobs) == len(test_jobs)


def test_list_jobs():
    """Test listing jobs."""
    print_header("TEST 3: List Jobs")
    try:
        resp = requests.get(f"{API_URL}/api/jobs", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            jobs = data.get("jobs", [])
            print_success(f"Found {len(jobs)} jobs")
            for job in jobs[:5]:  # Show first 5
                print(f"   - {job['title']} @ {job['company']}")
            if len(jobs) > 5:
                print(f"   ... and {len(jobs) - 5} more")
            return True
        else:
            print_error(f"Failed to list jobs: {resp.text}")
            return False
    except Exception as e:
        print_error(f"Error listing jobs: {e}")
        return False


def test_generate_user_embedding():
    """Test generating user embedding from learnings."""
    print_header("TEST 4: Generate User Embedding")
    try:
        resp = requests.post(
            f"{API_URL}/api/users/{TEST_USER_ID}/generate-embedding",
            timeout=30
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == 200:
                print_success(f"Embedding generated (ID: {data.get('embedding_id', 'N/A')[:8]}...)")
                return True
            else:
                print_error(f"No learnings found for user")
                return False
        else:
            print_error(f"Failed to generate embedding: {resp.text}")
            return False
    except Exception as e:
        print_error(f"Error generating embedding: {e}")
        return False


def test_job_matching():
    """Test job matching with similarity scores."""
    print_header("TEST 5: Job Matching (Cosine Similarity)")
    try:
        resp = requests.get(
            f"{API_URL}/api/jobs/match",
            params={"user_id": TEST_USER_ID, "page": 1, "per_page": 10},
            timeout=30
        )
        if resp.status_code == 200:
            data = resp.json()
            jobs = data.get("jobs", [])
            
            if not jobs:
                print_error("No jobs returned")
                return False
            
            print_success(f"Matched {len(jobs)} jobs (total: {data.get('total', 'N/A')})")
            print()
            print("   Rank | Similarity | Job Title")
            print("   -----|------------|" + "-" * 40)
            
            for i, job in enumerate(jobs, 1):
                sim = job.get('similarity', 0)
                bar = '█' * int(sim * 10) + '░' * (10 - int(sim * 10))
                title = job['title'][:35] + "..." if len(job['title']) > 35 else job['title']
                print(f"   {i:4} | {bar} {sim:.1%} | {title}")
            
            # Verify ordering (should be descending by similarity)
            similarities = [j['similarity'] for j in jobs]
            is_sorted = all(similarities[i] >= similarities[i+1] for i in range(len(similarities)-1))
            
            if is_sorted:
                print_success("Jobs correctly sorted by similarity (descending)")
            else:
                print_error("Jobs NOT correctly sorted!")
                return False
            
            return True
        elif resp.status_code == 404:
            print_error("User embedding not found. Run test 4 first.")
            return False
        else:
            print_error(f"Failed to match jobs: {resp.text}")
            return False
    except Exception as e:
        print_error(f"Error matching jobs: {e}")
        return False


def test_pagination():
    """Test pagination in job matching."""
    print_header("TEST 6: Pagination")
    try:
        # Get page 1
        resp1 = requests.get(
            f"{API_URL}/api/jobs/match",
            params={"user_id": TEST_USER_ID, "page": 1, "per_page": 3},
            timeout=30
        )
        
        # Get page 2
        resp2 = requests.get(
            f"{API_URL}/api/jobs/match",
            params={"user_id": TEST_USER_ID, "page": 2, "per_page": 3},
            timeout=30
        )
        
        if resp1.status_code == 200 and resp2.status_code == 200:
            data1 = resp1.json()
            data2 = resp2.json()
            
            jobs1 = [j['id'] for j in data1.get('jobs', [])]
            jobs2 = [j['id'] for j in data2.get('jobs', [])]
            
            # Check no overlap
            overlap = set(jobs1) & set(jobs2)
            
            print_info(f"Page 1: {len(jobs1)} jobs, has_more: {data1.get('has_more')}")
            print_info(f"Page 2: {len(jobs2)} jobs, has_more: {data2.get('has_more')}")
            
            if not overlap:
                print_success("Pagination working correctly (no overlap between pages)")
                return True
            else:
                print_error(f"Pagination error: {len(overlap)} overlapping jobs")
                return False
        else:
            print_error("Failed to fetch pages")
            return False
    except Exception as e:
        print_error(f"Error testing pagination: {e}")
        return False


def run_all_tests(cleanup_before=True, cleanup_after=True):
    """Run all tests and report results."""
    print("\n" + "=" * 60)
    print("  VECTOR EMBEDDINGS & JOB MATCHING - TEST SUITE")
    print("=" * 60)
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  API URL: {API_URL}")
    print(f"  Test User: {TEST_USER_ID[:8]}...")
    
    results = {}
    
    # Cleanup old test data first
    if cleanup_before:
        cleanup_test_jobs()
    
    # Run tests in order
    results["API Health"] = test_api_health()
    
    if not results["API Health"]:
        print_error("\nAPI not running. Please start the services first:")
        print("  docker compose up -d db lv-pyapi")
        sys.exit(1)
    
    results["Create Jobs"] = test_create_jobs()
    results["List Jobs"] = test_list_jobs()
    results["Generate Embedding"] = test_generate_user_embedding()
    results["Job Matching"] = test_job_matching()
    results["Pagination"] = test_pagination()
    
    # Summary
    print_header("TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}  {test_name}")
    
    print()
    print(f"  Results: {passed}/{total} tests passed")
    
    if passed == total:
        print_success("\nAll tests passed! 🎉")
        exit_code = 0
    else:
        print_error(f"\n{total - passed} test(s) failed")
        exit_code = 1
    
    # Cleanup test data after tests
    if cleanup_after:
        cleanup_test_jobs()
    
    return exit_code


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Test embeddings and job matching")
    parser.add_argument("--no-cleanup", action="store_true", help="Don't cleanup test data")
    parser.add_argument("--keep-jobs", action="store_true", help="Keep test jobs after running")
    args = parser.parse_args()
    
    sys.exit(run_all_tests(
        cleanup_before=not args.no_cleanup,
        cleanup_after=not args.keep_jobs and not args.no_cleanup
    ))
