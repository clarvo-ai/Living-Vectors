from sqlalchemy import String, DateTime, Boolean, Integer, BigInteger, ForeignKey, ForeignKeyConstraint, Table, ARRAY, Text, Float, Enum, text, func, event
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID, TIMESTAMP, DOUBLE_PRECISION, ENUM
from sqlalchemy.orm import DeclarativeBase, relationship, Mapped, mapped_column, Mapper
from pgvector.sqlalchemy import Vector
from uuid import UUID
from typing import Optional, List, Any, Sequence
from datetime import datetime
import enum

# Enum Classes
class MessageSender(enum.Enum):
    """Enum type for MessageSender"""
    USER = 'USER'
    AI = 'AI'


class UserRole(enum.Enum):
    """Enum type for UserRole"""
    USER = 'USER'
    ADMIN = 'ADMIN'



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


class ConversationMessage(Base):
    __tablename__ = "ConversationMessage"
    __table_args__ = {'schema': 'public'}

    messageId: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), primary_key=True, nullable=False, server_default=text("gen_random_uuid()"))
    userId: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("public.User.id"), nullable=False)
    sender: Mapped[MessageSender] = mapped_column(Enum(MessageSender), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    createdAt: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())
    learnedFrom: Mapped[bool] = mapped_column(Boolean, nullable=False)
    questionContext: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    _ConversationMessageToLearning: Mapped[List["_ConversationMessageToLearning"]] = relationship("_ConversationMessageToLearning", back_populates="conversationMessage")
    user: Mapped["User"] = relationship("User", back_populates="conversationMessage", uselist=False)


class Job(Base):
    __tablename__ = "Job"
    __table_args__ = {'schema': 'public'}

    id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), primary_key=True, nullable=False, server_default=text("gen_random_uuid()"))
    job_title: Mapped[str] = mapped_column(Text, nullable=False)
    job_description: Mapped[str] = mapped_column(Text, nullable=False)
    job_description_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    job_is_active: Mapped[bool] = mapped_column(Boolean, nullable=False)
    company_name: Mapped[str] = mapped_column(Text, nullable=False)
    company_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    company_industry: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    company_size: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    company_revenue: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    company_culture: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    company_values: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    published_date: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    last_day_to_apply: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    job_starting_date: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    country: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    working_mode: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    role_industry: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    employment_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    contract_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    job_level: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    summer_job_internship: Mapped[bool] = mapped_column(Boolean, nullable=False)
    required_skills: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    nice_to_have_skills: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    required_languages: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    nice_to_have_languages: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    language_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    required_education: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    required_experience_months: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    requirements: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    salary: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    salary_min: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    salary_max: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    bonus: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    commission: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    guessed_salary: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    guessed_salary_min: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    guessed_salary_max: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    guessed_bonus: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    guessed_commission: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    deprecated_perks: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    work_hours: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    work_hours_min: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    work_hours_max: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    work_hours_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    apply_link: Mapped[str] = mapped_column(Text, nullable=False)
    application_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    career_advancement_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recruiter_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recruiter_email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recruiter_phone: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    deprecated_keywords: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    original_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    sub_source: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    external_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    job_embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(1536), nullable=True)
    job_title_embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(1536), nullable=True)
    titleId: Mapped[Optional[UUID]] = mapped_column(PostgresUUID(as_uuid=True), nullable=True)
    organizationId: Mapped[Optional[UUID]] = mapped_column(PostgresUUID(as_uuid=True), nullable=True)

class JobRecommendation(Base):
    __tablename__ = "JobRecommendation"
    __table_args__ = {'schema': 'public'}

    id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), primary_key=True, nullable=False, server_default=text("gen_random_uuid()"))
    userId: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("public.User.id"), nullable=False)
    jobId: Mapped[str] = mapped_column(Text, nullable=False)
    score: Mapped[Optional[float]] = mapped_column(DOUBLE_PRECISION, nullable=True)
    timestamp: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="jobRecommendation", uselist=False)


class Learning(Base):
    __tablename__ = "Learning"
    __table_args__ = {'schema': 'public'}

    id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), primary_key=True, nullable=False, server_default=text("gen_random_uuid()"))
    userId: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("public.User.id"), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    createdAt: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    _ConversationMessageToLearning: Mapped[List["_ConversationMessageToLearning"]] = relationship("_ConversationMessageToLearning", back_populates="learning")
    user: Mapped["User"] = relationship("User", back_populates="learning", uselist=False)


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
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.USER)

    # Relationships
    account: Mapped[List["Account"]] = relationship("Account", back_populates="user")
    session: Mapped[List["Session"]] = relationship("Session", back_populates="user")
    authenticator: Mapped[List["Authenticator"]] = relationship("Authenticator", back_populates="user")
    conversationMessage: Mapped[List["ConversationMessage"]] = relationship("ConversationMessage", back_populates="user")
    learning: Mapped[List["Learning"]] = relationship("Learning", back_populates="user")
    jobRecommendation: Mapped[List["JobRecommendation"]] = relationship("JobRecommendation", back_populates="user")
    userEmbedding: Mapped["UserEmbedding"] = relationship("UserEmbedding", back_populates="user", uselist=False)


class UserEmbedding(Base):
    __tablename__ = "UserEmbedding"
    __table_args__ = {'schema': 'public'}

    id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), primary_key=True, nullable=False, server_default=text("gen_random_uuid()"))
    userId: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("public.User.id"), nullable=False)
    updatedAt: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="userEmbedding", uselist=False)


class VerificationToken(Base):
    __tablename__ = "VerificationToken"
    __table_args__ = {'schema': 'public'}

    identifier: Mapped[str] = mapped_column(Text, primary_key=True, nullable=False)
    token: Mapped[str] = mapped_column(Text, primary_key=True, nullable=False)
    expires: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)


class _ConversationMessageToLearning(Base):
    __tablename__ = "_ConversationMessageToLearning"
    __table_args__ = {'schema': 'public'}

    A: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("public.ConversationMessage.messageId"), primary_key=True, nullable=False, server_default=text("gen_random_uuid()"))
    B: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("public.Learning.id"), primary_key=True, nullable=False, server_default=text("gen_random_uuid()"))

    # Relationships
    conversationMessage: Mapped["ConversationMessage"] = relationship("ConversationMessage", back_populates="_ConversationMessageToLearning", uselist=False)
    learning: Mapped["Learning"] = relationship("Learning", back_populates="_ConversationMessageToLearning", uselist=False)


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

