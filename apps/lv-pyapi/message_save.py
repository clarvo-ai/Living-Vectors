from sqlalchemy.orm import Session
from python_utils.sqlalchemy_models import ConversationMessage, MessageSender

def save_message(db: Session, user_id: str, sender: MessageSender, content: str, question_context: dict = None):
    message = ConversationMessage(
        userId=user_id,
        sender=sender,
        content=content,
        learnedFrom=False,
        questionContext=question_context
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message