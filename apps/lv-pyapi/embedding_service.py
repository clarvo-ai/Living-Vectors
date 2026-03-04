"""
Embedding service using Gemini API.

This module wraps the Gemini embedding API to generate vector embeddings
from text. Used for both user learnings and job descriptions.
"""
from typing import List
from gemini_client import client

# Gemini embedding model and output dimensions
# Must match Job.job_embedding dimension (vector(1536) in the DB)
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 1536


def get_embedding(text: str) -> List[float]:
    """
    Generate embedding for text using Gemini API.
    
    Args:
        text: The text to embed (e.g., concatenated learnings or job description)
        
    Returns:
        List of 1536 floats representing the embedding vector
        
    Raises:
        ValueError: If text is empty
        Exception: If Gemini API call fails
    """
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")
    
    # Call Gemini embedding API
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config={"output_dimensionality": EMBEDDING_DIMENSIONS}
    )
    
    # Extract embedding from response
    # result.embeddings is a list, we take the first one
    return result.embeddings[0].values
