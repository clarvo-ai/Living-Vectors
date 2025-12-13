from google.cloud import texttospeech, speech
import os

# Initialize clients
# Ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set
# or configure authentication explicitly if needed.

def text_to_speech(text: str) -> bytes:
    """Converts text to speech using Google Cloud TTS"""
    client = texttospeech.TextToSpeechClient()

    input_text = texttospeech.SynthesisInput(text=text)

    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
    )

    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )

    response = client.synthesize_speech(
        input=input_text, voice=voice, audio_config=audio_config
    )

    return response.audio_content

def speech_to_text(audio_content: bytes) -> str:
    """Converts speech to text using Google Cloud STT"""
    client = speech.SpeechClient()

    audio = speech.RecognitionAudio(content=audio_content)
    
    # Note: The encoding and sample rate must match the audio sent from the frontend.
    # WebM/Opus is common for browser recording, but Google STT might need specific config.
    # For simplicity, we'll assume the frontend sends linear16 or we might need to transcode.
    # Or we can use WEBM_OPUS if supported.
    
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
        #encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=48000, # Standard for WebM
        language_code="en-US",
    )

    response = client.recognize(config=config, audio=audio)

    transcript = ""
    for result in response.results:
        transcript += result.alternatives[0].transcript + " "

    return transcript.strip()
