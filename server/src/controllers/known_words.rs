use crate::{
    error::{Error, Result},
    middleware::auth::CreateDeck,
    models::known_words,
    services::{
        known_words::{self as service, Words},
        tokens::{self, Scope},
    },
    settings::Settings,
};
use axum::{
    Extension, Json,
    extract::{Path, RawQuery, State},
    http::{HeaderMap, StatusCode, header},
};
use loco_rs::{app::AppContext, controller::Routes};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct Import {
    text: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Imported {
    imported_count: i64,
}
#[derive(Serialize)]
struct Exported {
    words: Vec<String>,
}

pub fn routes() -> Routes {
    Routes::new()
        .prefix("/api/known-words")
        .get("/", list)
        .post("/import", import)
        .delete("/", delete_all)
        .delete("/{word}", delete)
}

pub fn export_routes() -> Routes {
    Routes::new().get("/api/known-cards", export)
}

async fn list(_: CreateDeck, State(ctx): State<AppContext>) -> Result<Json<Words>> {
    Ok(Json(service::list(&ctx.db).await?))
}

async fn import(
    _: CreateDeck,
    State(ctx): State<AppContext>,
    Json(request): Json<Import>,
) -> Result<Json<Imported>> {
    if request.text.trim().is_empty() {
        return Err(Error::Invalid("text is required".into()));
    }
    Ok(Json(Imported {
        imported_count: service::import(&ctx.db, request.text).await?,
    }))
}

async fn delete(
    _: CreateDeck,
    State(ctx): State<AppContext>,
    Path(word): Path<String>,
) -> Result<StatusCode> {
    known_words::Entity::delete_many()
        .filter(known_words::Column::Word.eq(word.trim().to_lowercase()))
        .exec(&ctx.db)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn delete_all(_: CreateDeck, State(ctx): State<AppContext>) -> Result<StatusCode> {
    known_words::Entity::delete_many().exec(&ctx.db).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn export(
    State(ctx): State<AppContext>,
    Extension(settings): Extension<Settings>,
    headers: HeaderMap,
    RawQuery(query): RawQuery,
) -> Result<Json<Exported>> {
    let token = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or(Error::Unauthorized)?;
    tokens::validate(
        &ctx.db,
        &settings.token_encryption_key,
        token,
        Scope::KnownCardsExport,
    )
    .await?;
    let group_ids = query
        .into_iter()
        .flat_map(|query| {
            url::form_urlencoded::parse(query.as_bytes())
                .filter(|(key, _)| key == "groupId")
                .flat_map(|(_, value)| value.split(',').map(str::to_owned).collect::<Vec<_>>())
                .collect::<Vec<_>>()
        })
        .collect();
    Ok(Json(Exported {
        words: service::export(&ctx.db, group_ids).await?,
    }))
}
