from fastapi.testclient import TestClient
from main import app 

client = TestClient(app)

# Test Gemini endpoint with real API call
def test_gemini():
  response = client.post("/api/gemini", json={"prompt": "say only 'hello'"})
  data = response.json()
  assert response.status_code == 200
  assert data["status"] == 200
  assert len(data["message"]) > 0
  assert data["message"] == "hello"


  