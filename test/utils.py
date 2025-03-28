from os import environ

environ.setdefault("DB_USERNAME", "postgres")
environ.setdefault("DB_PASSWORD", "postgres")
environ.setdefault("DB_HOSTNAME", "localhost")
environ.setdefault("DB_PORT", "5460")
environ.setdefault("DB_NAME", "test")

from server.database import get_db, Card, ReviewLog, CardSource, Source


def cleanup_db():
    db = next(get_db())
    db.query(ReviewLog).delete()
    db.query(Card).delete()
    db.query(CardSource).delete()
    db.query(Source).delete()
    db.commit()


def populate_db():
    db = next(get_db())
    db.add(Source(id="goethe-a1", name="Goethe A1", file_name="A1_SD1_Wortliste_02.pdf", start_page=9))
    db.add(Source(id="goethe-a2", name="Goethe A2", file_name="Goethe-Zertifikat_A2_Wortliste.pdf", start_page=8))
    db.add(Source(id="goethe-b1", name="Goethe B1", file_name="Goethe-Zertifikat_B1_Wortliste.pdf", start_page=16))
    db.commit()
    return db
