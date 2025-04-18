from os import environ
from sqlalchemy import ForeignKey, MetaData, create_engine, JSON, Integer, Float, DateTime, Enum
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Mapped, mapped_column
from sqlalchemy.schema import CreateSchema
from sqlalchemy import event
from enum import IntEnum
from datetime import datetime

username = str(environ.get("DB_USERNAME"))
password = str(environ.get("DB_PASSWORD"))
hostname = str(environ.get("DB_HOSTNAME"))
port = int(environ.get("DB_PORT", "5432"))
database = str(environ.get("DB_NAME"))

engine = create_engine(
    f"postgresql+psycopg://{username}:{password}@{hostname}:{port}/{database}", echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    yield SessionLocal()


class Base(DeclarativeBase):
    metadata = MetaData(
        schema="py_learn_language",
    )


event.listen(Base.metadata, 'before_create', CreateSchema(
    Base.metadata.schema, if_not_exists=True))  # type: ignore


class State(IntEnum):
    Learning = 1
    Review = 2
    Relearning = 3


class Rating(IntEnum):
    Again = 1
    Hard = 2
    Good = 3
    Easy = 4


class Card(Base):
    __tablename__ = "cards"
    id: Mapped[str] = mapped_column(primary_key=True)
    source_id: Mapped[str] = mapped_column(
        ForeignKey("py_learn_language.sources.id"), nullable=False)
    data: Mapped[JSON] = mapped_column(type_=JSON, nullable=False)
    state: Mapped[State] = mapped_column(Enum(State), nullable=False)
    step: Mapped[int] = mapped_column(type_=Integer, nullable=True)
    stability: Mapped[float] = mapped_column(type_=Float, nullable=True)
    difficulty: Mapped[float] = mapped_column(type_=Float, nullable=True)
    due: Mapped[datetime] = mapped_column(type_=DateTime, nullable=False)
    last_review: Mapped[datetime] = mapped_column(
        type_=DateTime, nullable=True)


class Source(Base):
    __tablename__ = "sources"
    id: Mapped[str] = mapped_column(primary_key=True, nullable=False)
    name: Mapped[str] = mapped_column(unique=True, nullable=False)
    file_name: Mapped[str] = mapped_column(nullable=False)
    start_page: Mapped[int] = mapped_column(nullable=False)
    bookmarked_page: Mapped[int] = mapped_column(nullable=True)


class CardSource(Base):
    __tablename__ = "card_sources"
    card_id: Mapped[str] = mapped_column(ForeignKey(
        "py_learn_language.cards.id"), primary_key=True)
    source_id: Mapped[str] = mapped_column(ForeignKey(
        "py_learn_language.sources.id"), primary_key=True)
    page_number: Mapped[int] = mapped_column(nullable=False)


class ReviewLog(Base):
    __tablename__ = "review_logs"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    card_id: Mapped[str] = mapped_column(
        ForeignKey("py_learn_language.cards.id"), nullable=False)
    rating: Mapped[Rating] = mapped_column(Enum(Rating), nullable=False)
    review_datetime: Mapped[datetime] = mapped_column(
        type_=DateTime, nullable=False)
    review_duration: Mapped[int] = mapped_column(type_=Integer, nullable=True)


def init_db():
    Base.metadata.create_all(engine, checkfirst=True)
