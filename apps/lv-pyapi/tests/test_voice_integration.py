from fastapi.testclient import TestClient
from main import app
import pytest
import os

client = TestClient(app)

def test_tts_integration():
    creds_path = "credentials/google-credentials.json"
    if not os.path.exists(creds_path):
        pytest.skip("Skipping integration test: credentials not found")

    response = client.post("/api/tts", json={"text": "Hello world"})
    
    if response.status_code != 200:
        print(f"TTS Error Response: {response.json()}")

    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert len(response.content) > 0

def test_stt_integration():
    creds_path = "credentials/google-credentials.json"
    if not os.path.exists(creds_path):
        pytest.skip("Skipping integration test: credentials not found")
    
    tts_response = client.post("/api/tts", json={"text": "Hello world"})
    if tts_response.status_code != 200:
        pytest.fail("Could not generate audio for STT test")
        
    audio_content = tts_response.content
    
    response = client.post(
        "/api/stt", 
        files={"file": ("test_audio.mp3", audio_content, "audio/mpeg")}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "transcript" in data 
    assert isinstance(data['transcript'], str)
