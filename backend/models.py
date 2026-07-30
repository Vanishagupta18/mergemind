from sqlalchemy import create_engine, Column, String, Integer, DateTime, DECIMAL, JSON
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func
import uuid, os
from dotenv import load_dotenv

load_dotenv()
Base = declarative_base()

class PRReview(Base):
    __tablename__ = 'pr_reviews'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    repo_name = Column(String(200))
    pr_number = Column(Integer)
    pr_title = Column(String(500))
    diff_hash = Column(String(64), unique=True)
    bugs = Column(JSON)
    suggestions = Column(JSON)
    quality_score = Column(DECIMAL(3,1))
    summary = Column(String)
    status = Column(String(20), default='pending')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

engine = create_engine(os.getenv('DATABASE_URL'))

def init_db():
    Base.metadata.create_all(engine)
    print("Tables created successfully!")