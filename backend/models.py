from sqlalchemy import create_engine, Column, String, Integer, DateTime, DECIMAL, JSON, Boolean, UniqueConstraint
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func
import uuid, os
from dotenv import load_dotenv
from models import init_db
init_db()
load_dotenv()
Base = declarative_base()


class ReviewStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    RETRYING = "retrying"
    COMPLETED = "completed"
    FAILED = "failed"


class PRReview(Base):
    __tablename__ = 'pr_reviews'
    __table_args__ = (
        UniqueConstraint('repo_name', 'pr_number', 'diff_hash', name='uq_repo_pr_diffhash'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    repo_name = Column(String(200))
    pr_number = Column(Integer)
    pr_title = Column(String(500))
    filename = Column(String(500))
    diff_hash = Column(String(64))
    bugs = Column(JSON)
    suggestions = Column(JSON)
    quality_score = Column(DECIMAL(3, 1))
    summary = Column(String)
    review_json = Column(JSON)
    status = Column(String(20), default=ReviewStatus.PENDING)

    retry_count = Column(Integer, default=0)
    last_error = Column(String, nullable=True)
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PRCommentBatch(Base):
    """
    Tracks whether the MERGED GitHub comment for a specific set of file-diffs
    has already been posted. Keyed on a hash of all included file diff-hashes,
    so a task retry that re-processes the same batch won't double-post.
    """
    __tablename__ = 'pr_comment_batches'
    __table_args__ = (
        UniqueConstraint('repo_name', 'pr_number', 'batch_hash', name='uq_repo_pr_batchhash'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    repo_name = Column(String(200))
    pr_number = Column(Integer)
    batch_hash = Column(String(64))
    comment_posted = Column(Boolean, default=False)
    github_comment_id = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ReviewStats(Base):
    __tablename__ = 'review_stats'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    repo_name = Column(String(200))
    api_calls_made = Column(Integer, default=0)
    cache_hits = Column(Integer, default=0)
    files_skipped_filtered = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


engine = create_engine(os.getenv('DATABASE_URL'))

def init_db():
    Base.metadata.create_all(engine)
    print("Tables created successfully!")