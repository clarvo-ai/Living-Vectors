from fastapi.testclient import TestClient
from main import app 

client = TestClient(app)

# Test Gemini endpoint with real API call
def test_gemini():
  response = client.post("/api/chat/answer", json={
    "userAnswer": "say only 'hello'", 
    "questionId": {
      "goalIndex": 0,
      "questionIndex": 0
    }})
  data = response.json()
  assert response.status_code == 200
  assert data["status"] == 200
  assert len(data["message"]) > 0
  assert "nextQuestionId" in data
  assert "completed" in data
  #Can't really use this anymore since the prompt instructions go on top of this
  #assert data["message"] == "hello"


  