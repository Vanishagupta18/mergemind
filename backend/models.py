from sqlalchemy import create_engine, Column, String, Integer, DateTime, DECIMAL, JSON, UniqueConstraint
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func
import uuid, os
from dotenv import load_dotenv

load_dotenv()
Base = declarative_base()

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
    diff_hash = Column(String(64))  # no longer globally unique — see UniqueConstraint above
    bugs = Column(JSON)
    suggestions = Column(JSON)
    quality_score = Column(DECIMAL(3, 1))
    summary = Column(String)
    review_json = Column(JSON)       # full raw AI response, for future reuse
    status = Column(String(20), default='pending')
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ReviewStats(Base):
    """Running counters for cache efficiency — cheap to query for a dashboard later."""
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