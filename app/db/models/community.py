import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, JSON
)
from sqlalchemy.orm import relationship
from app.db.base import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class CommunityRequest(Base):
    __tablename__ = "community_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    book_id = Column(String(36), ForeignKey("books.id", ondelete="SET NULL"), nullable=True)
    title_query = Column(String(255), nullable=False)
    grade_level = Column(Integer, nullable=True)
    subject = Column(String(64), nullable=True)
    curriculum = Column(String(64), nullable=True)
    topics = Column(JSON, nullable=False, default=list)
    quantity = Column(Integer, nullable=False, default=1)
    deadline = Column(DateTime(timezone=True), nullable=True)
    coarse_location = Column(String(128), nullable=True)
    fulfillment_preference = Column(String(32), nullable=False, default="lend") # lend, donate, any
    status = Column(String(32), nullable=False, default="open", index=True) # open, matched, fulfilled, expired, cancelled
    
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    user = relationship("User")
    book = relationship("Book")

class SchoolShortage(Base):
    __tablename__ = "school_shortages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    book_id = Column(String(36), ForeignKey("books.id", ondelete="SET NULL"), nullable=True)
    book_title_fallback = Column(String(255), nullable=True)
    quantity_needed = Column(Integer, nullable=False, default=1)
    pledged_quantity = Column(Integer, nullable=False, default=0)
    confirmed_received_quantity = Column(Integer, nullable=False, default=0)
    priority = Column(String(32), nullable=False, default="normal") # urgent, normal, low
    deadline = Column(DateTime(timezone=True), nullable=True)
    preferred_support = Column(String(32), nullable=False, default="lend") # lend, donate
    status = Column(String(32), nullable=False, default="open") # open, fulfilled, closed

    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    organization = relationship("Organization", back_populates="shortages")
    book = relationship("Book")

class Resource(Base):
    __tablename__ = "resources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False, index=True)
    resource_type = Column(String(64), nullable=False, default="curriculum_guide") # syllabus, textbook_excerpt, open_courseware
    source_name = Column(String(255), nullable=False)
    source_url = Column(String(512), nullable=False)
    license_name = Column(String(128), nullable=False) # e.g. "CC BY-NC 4.0", "Public Domain"
    license_url = Column(String(512), nullable=True)
    rights_basis = Column(Text, nullable=False)
    allowed_actions = Column(JSON, nullable=False, default=list) # ["metadata", "link", "distribute_file"]
    evidence = Column(Text, nullable=True)
    verification_status = Column(String(32), nullable=False, default="pending", index=True) # pending, verified, rejected, needs_review
    verified_by = Column(String(36), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    takedown_status = Column(String(32), nullable=False, default="none") # none, takedown_requested, taken_down
    custom_data = Column(JSON, nullable=False, default=dict)

    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

class MediaFile(Base):
    __tablename__ = "media_files"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    mime_type = Column(String(64), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    checksum_sha256 = Column(String(64), nullable=False, index=True)
    purpose = Column(String(64), nullable=False, default="book_cover") # book_cover, report_evidence, resource_file
    owner_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    reporter_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    target_entity_type = Column(String(32), nullable=False) # user, copy, loan, resource
    target_entity_id = Column(String(36), nullable=False, index=True)
    category = Column(String(32), nullable=False) # spam, harassment, fraud, unsafe_meeting, copyright, fake_book, wrong_information, damaged_or_lost, other
    description = Column(Text, nullable=False)
    evidence_media_ids = Column(JSON, nullable=False, default=list)
    status = Column(String(32), nullable=False, default="open", index=True) # open, reviewing, resolved, rejected
    resolution_note = Column(Text, nullable=True)
    resolved_by = Column(String(36), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    reporter = relationship("User")

class UserBlock(Base):
    __tablename__ = "user_blocks"
    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_id", name="uq_user_block"),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    blocker_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    blocked_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("loan_id", "author_id", name="uq_loan_review_per_author"),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    loan_id = Column(String(36), ForeignKey("loans.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    target_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(Integer, nullable=False) # 1 to 5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    loan = relationship("Loan", back_populates="reviews")
    author = relationship("User", foreign_keys=[author_id])
    target_user = relationship("User", foreign_keys=[target_user_id])

class TrustEvent(Base):
    __tablename__ = "trust_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    loan_id = Column(String(36), ForeignKey("loans.id", ondelete="SET NULL"), nullable=True)
    event_type = Column(String(64), nullable=False) # on_time_return, late_return, dispute_incident, correction
    score_delta = Column(Numeric(5, 2), nullable=False, default=0.0)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
