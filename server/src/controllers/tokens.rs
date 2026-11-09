use crate::{
    error::Result,
    middleware::auth::CreateDeck,
    models::api_tokens,
    services::tokens::{self, CreateToken, Token},
    settings::Settings,
};
use axum::{
    Extension, Json,
    extract::{Path, State},
    http::StatusCode,
};
use loco_rs::{app::AppContext, controller::Routes};
use sea_orm::EntityTrait;

pub fn routes() -> Routes {
    Routes::new()
        .prefix("/api/api-tokens")
        .get("/", list)
        .post("/", create)
        .delete("/{id}", delete)
}

async fn list(_: CreateDeck, State(ctx): State<AppContext>) -> Result<Json<Vec<Token>>> {
    Ok(Json(tokens::list(&ctx.db).await?))
}

async fn create(
    _: CreateDeck,
    State(ctx): State<AppContext>,
    Extension(settings): Extension<Settings>,
    Json(request): Json<CreateToken>,
) -> Result<Json<Token>> {
    Ok(Json(
        tokens::create(&ctx.db, &settings.token_encryption_key, request).await?,
    ))
}

async fn delete(
    _: CreateDeck,
    State(ctx): State<AppContext>,
    Path(id): Path<i32>,
) -> Result<StatusCode> {
    api_tokens::Entity::delete_by_id(id).exec(&ctx.db).await?;
    Ok(StatusCode::NO_CONTENT)
}
