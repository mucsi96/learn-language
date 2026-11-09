use crate::{
    error::{Error, Result},
    middleware::auth::{CreateDeck, ReadDecks},
    models::source_groups,
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
struct CreateRequest {
    id: String,
    name: String,
}
#[derive(Deserialize)]
struct UpdateRequest {
    name: String,
}

fn validate(value: String) -> Result<String> {
    if value.trim().is_empty() || value.chars().count() > 255 {
        return Err(Error::Invalid(
            "id and name must contain between 1 and 255 characters".into(),
        ));
    }
    Ok(value)
}

pub fn routes() -> Routes {
    Routes::new()
        .prefix("/api/source-groups")
        .get("/", list)
        .post("/", create)
        .put("/{id}", update)
        .delete("/{id}", delete)
}

async fn list(
    _: ReadDecks,
    State(ctx): State<AppContext>,
) -> Result<Json<Vec<source_groups::Model>>> {
    Ok(Json(source_groups::Entity::find().all(&ctx.db).await?))
}

async fn create(
    _: CreateDeck,
    State(ctx): State<AppContext>,
    Json(request): Json<CreateRequest>,
) -> Result<Json<source_groups::Model>> {
    let id = validate(request.id)?;
    if source_groups::Entity::find_by_id(&id)
        .one(&ctx.db)
        .await?
        .is_some()
    {
        return Err(Error::Conflict(format!(
            "Source group already exists: {id}"
        )));
    }
    Ok(Json(
        source_groups::ActiveModel {
            id: Set(id),
            name: Set(validate(request.name)?),
        }
        .insert(&ctx.db)
        .await?,
    ))
}

async fn update(
    _: CreateDeck,
    State(ctx): State<AppContext>,
    Path(id): Path<String>,
    Json(request): Json<UpdateRequest>,
) -> Result<Json<source_groups::Model>> {
    let existing = source_groups::Entity::find_by_id(id)
        .one(&ctx.db)
        .await?
        .ok_or(Error::NotFound)?;
    Ok(Json(
        source_groups::ActiveModel {
            name: Set(validate(request.name)?),
            ..existing.into_active_model()
        }
        .update(&ctx.db)
        .await?,
    ))
}

async fn delete(
    _: CreateDeck,
    State(ctx): State<AppContext>,
    Path(id): Path<String>,
) -> Result<StatusCode> {
    source_groups::Entity::delete_by_id(id)
        .exec(&ctx.db)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}
