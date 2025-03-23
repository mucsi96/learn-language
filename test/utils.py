from fsrs import Card, ReviewLog
import psycopg

from ..server.database import CardSource, Source, get_db


def cleanup_db():
    conn1 = psycopg.connect(
        database="test",
        host="localhost",
        user="postgres",
        password="postgres",
        port="8082",
    )
    cur1 = conn1.cursor()

    cur1.execute("DROP SCHEMA IF EXISTS test1 CASCADE")

    conn1.commit()
    cur1.close()


if __name__ == "__main__":
    cleanup_db()
