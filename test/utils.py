import psycopg

def cleanup_db():
    conn = psycopg.connect(
        dbname="test",
        host="localhost",
        user="postgres",
        password="postgres",
        port="5460",
    )
    cur = conn.cursor()

    cur.execute("DROP SCHEMA IF EXISTS learn_language CASCADE")

    conn.commit()
    cur.close()


def populate_db():
    conn = psycopg.connect(
        dbname="test",
        host="localhost",
        user="postgres",
        password="postgres",
        port="5460",
    )
    cur = conn.cursor()
    cur.execute(
        """
        CREATE SCHEMA learn_language;
        CREATE TABLE learn_language.sources (
            id character varying NOT NULL,
            name character varying NOT NULL,
            file_name character varying NOT NULL,
            start_page integer NOT NULL,
            bookmarked_page integer
        );
        INSERT INTO learn_language.sources (id, name, file_name, start_page, bookmarked_page) VALUES
        ('goethe-a1', 'Goethe A1', 'A1_SD1_Wortliste_02.pdf', 9, NULL),
        ('goethe-a2', 'Goethe A2', 'Goethe-Zertifikat_A2_Wortliste.pdf', 8, NULL),
        ('goethe-b1', 'Goethe B1', 'Goethe-Zertifikat_B1_Wortliste.pdf', 16, NULL);

    """
    )

    conn.commit()
    cur.close()
