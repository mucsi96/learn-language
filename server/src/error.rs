use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("{0}")]
    Invalid(String),
    #[error("Resource not found")]
    NotFound,
    #[error("Authentication required")]
    Unauthorized,
    #[error("Access denied")]
    Forbidden,
    #[error("{0}")]
    Conflict(String),
    #[error(transparent)]
    Database(#[from] sea_orm::DbErr),
    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

#[derive(Serialize)]
struct Problem {
    detail: String,
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let (status, detail) = match &self {
            Self::Invalid(detail) => (StatusCode::BAD_REQUEST, detail.clone()),
            Self::NotFound => (StatusCode::NOT_FOUND, self.to_string()),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, self.to_string()),
            Self::Forbidden => (StatusCode::FORBIDDEN, self.to_string()),
            Self::Conflict(detail) => (StatusCode::CONFLICT, detail.clone()),
            Self::Database(_) | Self::Internal(_) => {
                tracing::error!(error = %self, "request failed");
                (StatusCode::INTERNAL_SERVER_ERROR, "Request failed".into())
            }
        };
        (status, Json(Problem { detail })).into_response()
    }
}
