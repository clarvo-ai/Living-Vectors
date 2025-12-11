from sqlalchemy import String, DateTime, Boolean, Integer, BigInteger, ForeignKey, ForeignKeyConstraint, Table, ARRAY, Text, Float, Enum, text, func, event
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID, TIMESTAMP, DOUBLE_PRECISION, ENUM
from sqlalchemy.orm import DeclarativeBase, relationship, Mapped, mapped_column, Mapper
from sqlalchemy.types import TypeDecorator
from uuid import UUID
from typing import Optional, List, Any, Sequence
from datetime import datetime
import enum


# Base Class
class Base(DeclarativeBase):
    pass

def trim_strings(mapper: Mapper, connection, target):
    """Trim whitespace from all string attributes before insert/update"""
    for key, value in vars(target).items():
        # Skip SQLAlchemy internal attributes and non-string values
        if not key.startswith('_') and isinstance(value, str):
            setattr(target, key, value.strip())

# Apply string trimming to all models before insert and update
@event.listens_for(Base, "before_insert", propagate=True)
@event.listens_for(Base, "before_update", propagate=True)
def receive_before_insert_update(mapper, connection, target):
    trim_strings(mapper, connection, target)



# Model Classes
class Account(Base):
    __tablename__ = "Account"
    __table_args__ = {'schema': 'public'}

    userId: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("public.User.id"), nullable=False)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(Text, primary_key=True, nullable=False)
    providerAccountId: Mapped[str] = mapped_column(Text, primary_key=True, nullable=False)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expires_at: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    token_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scope: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    id_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    session_state: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    first_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    picture_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="account", uselist=False)


class Authenticator(Base):
    __tablename__ = "Authenticator"
    __table_args__ = {'schema': 'public'}

    credentialID: Mapped[str] = mapped_column(Text, primary_key=True, nullable=False)
    userId: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("public.User.id"), primary_key=True, nullable=False, server_default=text("gen_random_uuid()"))
    providerAccountId: Mapped[str] = mapped_column(Text, nullable=False)
    credentialPublicKey: Mapped[str] = mapped_column(Text, nullable=False)
    counter: Mapped[int] = mapped_column(Integer, nullable=False)
    credentialDeviceType: Mapped[str] = mapped_column(Text, nullable=False)
    credentialBackedUp: Mapped[bool] = mapped_column(Boolean, nullable=False)
    transports: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="authenticator", uselist=False)


class Session(Base):
    __tablename__ = "Session"
    __table_args__ = {'schema': 'public'}

    sessionToken: Mapped[str] = mapped_column(Text, primary_key=True, nullable=False, unique=True)
    userId: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("public.User.id"), nullable=False)
    expires: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)
    createdAt: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    ipAddress: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    userAgent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="session", uselist=False)


class User(Base):
    __tablename__ = "User"
    __table_args__ = {'schema': 'public'}

    id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), primary_key=True, nullable=False, server_default=text("gen_random_uuid()"))
    createdAt: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    emailVerified: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    first_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    image: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    account: Mapped[List["Account"]] = relationship("Account", back_populates="user")
    session: Mapped[List["Session"]] = relationship("Session", back_populates="user")
    authenticator: Mapped[List["Authenticator"]] = relationship("Authenticator", back_populates="user")
    conversation_messages: Mapped[List["ConversationMessage"]] = relationship("ConversationMessage", back_populates="user")
    
class Vector(TypeDecorator):
    """Custom type for PostgreSQL vector type"""
    impl = String
    cache_ok = True

    def __init__(self, dimensions=None):
        super().__init__()
        self.dimensions = dimensions

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value

class VerificationToken(Base):
    __tablename__ = "VerificationToken"
    __table_args__ = {'schema': 'public'}

    identifier: Mapped[str] = mapped_column(Text, primary_key=True, nullable=False)
    token: Mapped[str] = mapped_column(Text, primary_key=True, nullable=False)
    expires: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)


class _prisma_migrations(Base):
    __tablename__ = "_prisma_migrations"
    __table_args__ = {'schema': 'public'}

    id: Mapped[str] = mapped_column(Text, primary_key=True, nullable=False)
    checksum: Mapped[str] = mapped_column(Text, nullable=False)
    finished_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    migration_name: Mapped[str] = mapped_column(Text, nullable=False)
    logs: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rolled_back_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    started_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)
    applied_steps_count: Mapped[int] = mapped_column(Integer, nullable=False)

class MessageSender(enum.Enum):
    USER = "USER"
    AI = "AI"

class ConversationMessage(Base):
    __tablename__ = "ConversationMessage"
    __table_args__ = {'schema': 'public'}

    messageId: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), primary_key=True, nullable=False, server_default=text("gen_random_uuid()"))
    userId: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("public.User.id"), nullable=False)
    sender: Mapped[MessageSender] = mapped_column(ENUM(MessageSender, name="MessageSender"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    createdAt: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="conversation_messages")