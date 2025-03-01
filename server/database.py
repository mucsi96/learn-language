from os import environ
from sqlalchemy import MetaData, create_engine, JSON
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Mapped, mapped_column
from sqlalchemy.schema import CreateSchema
from sqlalchemy import event
from urllib.parse import quote_plus

username = quote_plus(environ.get("DB_USERNAME"))
password = quote_plus(environ.get("DB_PASSWORD"))

engine = create_engine(
    f"postgresql+psycopg://{username}:{password}@localhost:8484/postgres1", echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    yield SessionLocal()


class Base(DeclarativeBase):
    metadata = MetaData(
        schema="learn_language",
    )
    
event.listen(Base.metadata, 'before_create', CreateSchema(Base.metadata.schema, if_not_exists=True))

class Card(Base):
    __tablename__ = "cards"
    id: Mapped[str] = mapped_column(primary_key=True)
    data: Mapped[JSON] = mapped_column(type_=JSON)

class Source(Base):
    __tablename__ = "sources"
    id: Mapped[str] = mapped_column(primary_key=True, nullable=False)
    name: Mapped[str] = mapped_column(unique=True, nullable=False)
    file_name: Mapped[str] = mapped_column(nullable=False)
    start_page: Mapped[int] = mapped_column(nullable=False)
    bookmarked_page: Mapped[int] = mapped_column(nullable=True)

def create_all():
    Base.metadata.create_all(engine, checkfirst=True)
    print("Tables created")


if __name__ == "__main__":
    create_all()
