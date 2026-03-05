from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()


class Conversation(Base):
    __tablename__ = 'conversations'

    id         = Column(Integer, primary_key=True)
    session_id = Column(String(64), nullable=False, index=True)
    role       = Column(String(16), nullable=False)   # 'user' or 'assistant'
    content    = Column(Text, nullable=False)
    ts         = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Lead(Base):
    __tablename__ = 'leads'

    id         = Column(Integer, primary_key=True)
    session_id = Column(String(64), nullable=False, index=True)
    name       = Column(String(120))
    email      = Column(String(254), nullable=False)
    context    = Column(Text)    # what they were asking about
    ts         = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db(db_path='chatbot.db'):
    engine = create_engine(f'sqlite:///{db_path}', echo=False)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return engine, Session
