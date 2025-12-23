"""
Manual test script for the agent endpoint.
This script should be run manually, not by pytest.

Usage:
    python3 tests/manual_test_agent.py
"""
import requests
import sys

def main():
    """Run manual test of agent endpoint"""
    try:
        print("Sending request to agent endpoint...")
        print("(This may take 10-30 seconds for the first API call)")
        
        # Add timeout to prevent hanging
        response = requests.post(
            "http://localhost:8080/api/agent",
            json={"prompt": "Say hello"},
            timeout=60  # 60 second timeout
        )
        
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except requests.exceptions.Timeout:
        print("\nERROR: Request timed out after 60 seconds.")
        print("The agent might be taking too long, or there's an issue with the Gemini API.")
        print("Check:")
        print("  1. Is GEMINI_API_KEY set in your .env file?")
        print("  2. Check the server logs for errors")
        sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to server. Make sure the server is running on http://localhost:8080")
        print("Start the server with:")
        print("  cd apps/lv-pyapi")
        print("  python3 -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload")
        sys.exit(1)
    except ImportError:
        print("ERROR: 'requests' library not installed. Install it with:")
        print("  pip install requests")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
