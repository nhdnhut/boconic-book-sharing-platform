import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    CheckConstraint, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, JSON
)
from sqlalchemy.orm import relationship
from app.db.base import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Book(Base):
    __tablename__ = "books"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False, index=True)
    subtitle = Column(String(255), nullable=True)
    publisher = Column(String(255), nullable=True, index=True)
    publication_year = Column(Integer, nullable=True)
    edition_label = Column(String(64), nullable=True) # e.g. "Tái bản lần 1", "2024"
    language = Column(String(32), nullable=False, default="vi")
    subject = Column(String(64), nullable=True, index=True) # e.g. "Toán học", "Vật lý"
    grade_level = Column(Integer, nullable=True, index=True) # 1 to 12
    curriculum = Column(String(64), nullable=True, index=True) # e.g. "Kết nối tri thức", "Chân trời sáng tạo"
    isbn10 = Column(String(16), nullable=True, index=True)
    isbn13 = Column(String(32), unique=True, nullable=True, index=True)
    description = Column(Text, nullable=True)
    cover_media_id = Column(String(36), nullable=True)
    metadata_source = Column(String(64), nullable=False, default="manual")
    verification_status = Column(String(32), nullable=False, default="unverified") # unverified, verified
    archived_at = Column(DateTime(timezone=True), nullable=True)
    version = Column(Integer, nullable=False, default=1)
    custom_data = Column(JSON, nullable=False, default=dict)

    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    copies = relationship("BookCopy", back_populates="book", cascade="all, delete-orphan")
    chapters = relationship("Chapter", back_populates="book", cascade="all, delete-orphan")
    authors = relationship("BookAuthor", back_populates="book", cascade="all, delete-orphan")

class Author(Base):
    __tablename__ = "authors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, unique=True, index=True)
    bio = Column(Text, nullable=True)

    books = relationship("BookAuthor", back_populates="author")

class BookAuthor(Base):
    __tablename__ = "book_authors"
    __table_args__ = (
        UniqueConstraint("book_id", "author_id", name="uq_book_author"),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    book_id = Column(String(36), ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(String(36), ForeignKey("authors.id", ondelete="CASCADE"), nullable=False, index=True)

    book = relationship("Book", back_populates="authors")
    author = relationship("Author", back_populates="books")

class Publisher(Base):
    __tablename__ = "publishers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, unique=True, index=True)
    address = Column(String(255), nullable=True)

class BookCopy(Base):
    __tablename__ = "book_copies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    book_id = Column(String(36), ForeignKey("books.id", ondelete="RESTRICT"), nullable=False, index=True)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    current_holder_id = Column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    public_code = Column(String(32), unique=True, nullable=False, index=True) # e.g. "BOC-9A4F"
    condition = Column(String(32), nullable=False, default="good") # new, like_new, good, fair, poor
    circulation_status = Column(String(32), nullable=False, default="available", index=True) # available, reserved, loaned, maintenance, lost
    maximum_loan_days = Column(Integer, nullable=False, default=14)
    chain_lending_allowed = Column(Integer, nullable=False, default=0) # 0: False, 1: True
    lending_policy = Column(String(64), nullable=False, default="free_return")
    storage_location_private = Column(Text, nullable=True) # private note for owner
    notes = Column(Text, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    custom_data = Column(JSON, nullable=False, default=dict)

    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    book = relationship("Book", back_populates="copies")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_copies")
    current_holder = relationship("User", foreign_keys=[current_holder_id])
    borrow_requests = relationship("BorrowRequest", back_populates="copy")
    loans = relationship("Loan", back_populates="copy")

class Chapter(Base):
    __tablename__ = "chapters"
    __table_args__ = (
        CheckConstraint("page_start <= page_end AND page_start >= 1", name="chk_chapter_page_order"),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    book_id = Column(String(36), ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    chapter_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    page_start = Column(Integer, nullable=False)
    page_end = Column(Integer, nullable=False)
    topics = Column(JSON, nullable=False, default=list) # array of topic names
    source = Column(String(64), nullable=False, default="manual")
    verification_status = Column(String(32), nullable=False, default="unverified")

    book = relationship("Book", back_populates="chapters")
    chapter_topics = relationship("ChapterTopic", back_populates="chapter", cascade="all, delete-orphan")

class Topic(Base):
    __tablename__ = "topics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(128), nullable=False, unique=True, index=True)
    subject = Column(String(64), nullable=True)

class ChapterTopic(Base):
    __tablename__ = "chapter_topics"
    __table_args__ = (
        UniqueConstraint("chapter_id", "topic_id", name="uq_chapter_topic"),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    chapter_id = Column(String(36), ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)

    chapter = relationship("Chapter", back_populates="chapter_topics")
    topic = relationship("Topic")
