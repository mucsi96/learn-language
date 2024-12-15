from os import environ
from sqlalchemy import MetaData, create_engine, JSON
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Mapped, mapped_column
from sqlalchemy.schema import CreateSchema
from sqlalchemy import event
from urllib.parse import quote_plus

username = quote_plus(environ.get("DEMO_DB_USERNAME"))
password = quote_plus(environ.get("DEMO_DB_PASSWORD"))

engine = create_engine(
    f"postgresql+psycopg://{username}:{password}@localhost:8484/demo", echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    yield SessionLocal()


class Base(DeclarativeBase):
    metadata = MetaData(
        schema="learn_language",
    )
    
event.listen(Base.metadata, 'before_create', CreateSchema(Base.metadata.schema))

class Card(Base):
    __tablename__ = "cards"
    id: Mapped[str] = mapped_column(primary_key=True)
    data: Mapped[JSON] = mapped_column(type_=JSON)

def create_all():
    Base.metadata.create_all(engine)


if __name__ == "__main__":
    create_all()
