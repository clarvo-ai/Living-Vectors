"""
User embedding generation from learnings.

This module generates a single embedding vector for a user by:
1. Fetching all their learnings
2. Concatenating the text
3. Calling Gemini to get an embedding
4. Storing it in the UserEmbedding table
"""
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime

from python_utils.sqlalchemy_models import Learning, UserEmbedding
from embedding_service import get_embedding


def generate_user_embedding(user_id: str, db: Session) -> Optional[UserEmbedding]:
    """
    Generate embedding for a user from all their learnings.
    
    This is the core function that:
    1. Fetches all learnings for the user
    2. Concatenates summaries into one text
    3. Generates embedding via Gemini
    4. Upserts into UserEmbedding table (update if exists, insert if new)
    
    Args:
        user_id: The user's ID (UUID as string)
        db: Database session
        
    Returns:
        The UserEmbedding record, or None if user has no learnings
    """
    # 1. Fetch all non-soft-deleted learnings for user, ordered by creation time
    stmt = (
        select(Learning)
        .where(Learning.userId == user_id, Learning.soft_delete == False)
        .order_by(Learning.createdAt)
    )
    result = db.execute(stmt)
    learnings = result.scalars().all()
    
    if not learnings:
        print(f"No learnings found for user {user_id}")
        return None
    
    # 2. Concatenate all learning summaries into one text
    # Each learning is a separate insight about the user
    combined_text = " ".join([l.summary for l in learnings])
    print(f"Generating embedding for user {user_id} from {len(learnings)} learnings ({len(combined_text)} chars)")
    
    # 3. Generate embedding via Gemini
    embedding = get_embedding(combined_text)
    
    # 4. Upsert into UserEmbedding table
    # Check if user already has an embedding
    existing = db.query(UserEmbedding).filter_by(userId=user_id).first()
    
    if existing:
        # Update existing embedding
        existing.embedding = embedding
        existing.updatedAt = datetime.utcnow()
        db.commit()
        print(f"Updated embedding for user {user_id}")
        return existing
    else:
        # Create new embedding
        user_embedding = UserEmbedding(
            userId=user_id,
            embedding=embedding,
            updatedAt=datetime.utcnow(),
        )
        db.add(user_embedding)
        db.commit()
        db.refresh(user_embedding)
        print(f"Created new embedding for user {user_id}")
        return user_embedding
