"""
Embedding service using OpenAI API.

This module wraps the OpenAI embedding API to generate vector embeddings
from text. Used for both user learnings and job descriptions.
"""
import os
from typing import List
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# OpenAI embedding model, default dimensions is 1536 for text-embedding-3-small
EMBEDDING_MODEL = "text-embedding-3-small"

def get_embedding(text: str) -> List[float]:
    """
    Generate embedding for text using OpenAI API.
    
    Args:
        text: The text to embed (e.g., concatenated learnings or job description)
        
    Returns:
        List of 1536 floats representing the embedding vector
        
    Raises:
        ValueError: If text is empty or OPENAI_API_KEY not set
        Exception: If OpenAI API call fails
    """
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")
    
    # Check for API key at runtime
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    
    # Create client
    client = OpenAI(api_key=api_key)
    
    # Call OpenAI embedding API
    response = client.embeddings.create(
        input=text,
        model=EMBEDDING_MODEL,
    )
    
    # Extract embedding from response
    return response.data[0].embedding
