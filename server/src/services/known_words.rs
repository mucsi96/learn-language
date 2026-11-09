use crate::{
    error::Result,
    models::{cards, known_words, sources},
};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseConnection, DbBackend, EntityTrait, QueryFilter,
    QueryOrder, QuerySelect, QueryTrait, Statement,
};
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Word {
    word: String,
    hungarian_translation: Option<String>,
}

#[derive(Serialize)]
pub struct Words {
    words: Vec<Word>,
    count: usize,
}

pub async fn list(db: &DatabaseConnection) -> Result<Words> {
    let words = known_words::Entity::find()
        .order_by_asc(known_words::Column::Word)
        .all(db)
        .await?
        .into_iter()
        .map(|row| Word {
            word: row.word,
            hungarian_translation: row.hungarian_translation,
        })
        .collect::<Vec<_>>();
    Ok(Words {
        count: words.len(),
        words,
    })
}

pub async fn import(db: &DatabaseConnection, text: String) -> Result<i64> {
    let result = db.query_one_raw(Statement::from_sql_and_values(DbBackend::Postgres, r#"
        WITH lines AS (
            SELECT line, ordinal FROM regexp_split_to_table($1, E'[\\n\\r]+') WITH ORDINALITY AS t(line, ordinal)
        ), parsed AS (
            SELECT DISTINCT ON (lower(trim(split_part(line, ',', 1))))
                lower(trim(split_part(line, ',', 1))) AS word,
                CASE WHEN strpos(line, ',') > 0 THEN trim(substr(line, strpos(line, ',') + 1)) END AS translation
            FROM lines WHERE trim(split_part(line, ',', 1)) <> ''
            ORDER BY lower(trim(split_part(line, ',', 1))), ordinal
        ), inserted AS (
            INSERT INTO learn_language.known_words (word, hungarian_translation)
            SELECT word, translation FROM parsed ON CONFLICT (word) DO NOTHING RETURNING id
        ) SELECT count(*) AS count FROM inserted
    "#, [text.into()])).await?.ok_or(crate::error::Error::NotFound)?;
    Ok(result.try_get("", "count")?)
}

pub async fn export(db: &DatabaseConnection, group_ids: Vec<String>) -> Result<Vec<String>> {
    let card_query = cards::Entity::find();
    let card_query = if group_ids.is_empty() {
        card_query
    } else {
        card_query.filter(
            cards::Column::SourceId.in_subquery(
                sources::Entity::find()
                    .select_only()
                    .column(sources::Column::Id)
                    .filter(sources::Column::GroupId.is_in(group_ids))
                    .into_query(),
            ),
        )
    };
    let card_words = card_query.all(db).await?.into_iter().filter_map(|card| {
        card.data
            .get("word")
            .and_then(|value| value.as_str())
            .map(str::to_owned)
    });
    let known = known_words::Entity::find()
        .all(db)
        .await?
        .into_iter()
        .map(|row| row.word);
    Ok(card_words
        .chain(known)
        .map(|word| word.trim().to_lowercase())
        .filter(|word| !word.is_empty())
        .collect::<std::collections::BTreeSet<_>>()
        .into_iter()
        .collect())
}
