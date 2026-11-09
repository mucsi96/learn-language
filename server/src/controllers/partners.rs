use crate::{
    error::{Error, Result},
    middleware::auth::{CreateDeck, ReadDecks},
    models::learning_partners,
};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use loco_rs::{app::AppContext, controller::Routes};
use sea_orm::{ActiveModelTrait, EntityTrait, IntoActiveModel, Set};
use serde::Deserialize;

#[derive(Deserialize)]
struct Request {
    name: String,
}

fn validate_name(name: String) -> Result<String> {
    if name.trim().is_empty() || name.chars().count() > 255 {
        return Err(Error::Invalid(
            "name must contain between 1 and 255 characters".into(),
        ));
    }
    Ok(name)
}

pub fn routes() -> Routes {
    Routes::new()
        .prefix("/api/learning-partners")
        .get("/", list)
        .post("/", create)
        .put("/{id}", update)
        .delete("/{id}", delete)
}

async fn list(
    _: ReadDecks,
    State(ctx): State<AppContext>,
) -> Result<Json<Vec<learning_partners::Model>>> {
    Ok(Json(learning_partners::Entity::find().all(&ctx.db).await?))
}

async fn create(
    _: CreateDeck,
    State(ctx): State<AppContext>,
    Json(request): Json<Request>,
) -> Result<Json<learning_partners::Model>> {
    Ok(Json(
        learning_partners::ActiveModel {
            name: Set(validate_name(request.name)?),
            ..Default::default()
        }
        .insert(&ctx.db)
        .await?,
    ))
}

async fn update(
    _: CreateDeck,
    State(ctx): State<AppContext>,
    Path(id): Path<i32>,
    Json(request): Json<Request>,
) -> Result<Json<learning_partners::Model>> {
    let existing = learning_partners::Entity::find_by_id(id)
        .one(&ctx.db)
        .await?
        .ok_or(Error::NotFound)?;
    Ok(Json(
        learning_partners::ActiveModel {
            name: Set(validate_name(request.name)?),
            ..existing.into_active_model()
        }
        .update(&ctx.db)
        .await?,
    ))
}

async fn delete(
    _: CreateDeck,
    State(ctx): State<AppContext>,
    Path(id): Path<i32>,
) -> Result<StatusCode> {
    if learning_partners::Entity::delete_by_id(id)
        .exec(&ctx.db)
        .await?
        .rows_affected
        == 0
    {
        return Err(Error::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}
