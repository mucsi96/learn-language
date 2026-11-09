use axum::{
    extract::{Request, State},
    http::{Method, StatusCode, header},
    middleware::Next,
    response::Response,
};

pub async fn protect(
    State(origin): State<String>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let safe = matches!(
        *request.method(),
        Method::GET | Method::HEAD | Method::OPTIONS
    );
    let dictionary = request.method() == Method::POST && request.uri().path() == "/api/dictionary";
    if !safe && !dictionary {
        let values = request
            .headers()
            .get_all(header::ORIGIN)
            .iter()
            .collect::<Vec<_>>();
        if values.len() != 1 || values[0].to_str().ok() != Some(origin.as_str()) {
            return Err(StatusCode::FORBIDDEN);
        }
    }
    Ok(next.run(request).await)
}
