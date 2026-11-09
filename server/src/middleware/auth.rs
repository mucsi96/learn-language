use anyhow::ensure;
use axum::{
    extract::{FromRequestParts, Request, State},
    http::{StatusCode, header, request::Parts},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode, decode_header, jwk::JwkSet};
use serde::Deserialize;
use std::{
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct Auth(Arc<Inner>);

struct Inner {
    issuer: String,
    audience: String,
    jwks_url: String,
    client: reqwest::Client,
    keys: RwLock<(Instant, JwkSet)>,
}

#[derive(Deserialize)]
struct Discovery {
    issuer: String,
    jwks_uri: String,
}

#[derive(Clone, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub oid: Option<String>,
    pub given_name: Option<String>,
    pub name: Option<String>,
    #[serde(default)]
    scp: String,
    #[serde(default)]
    roles: Vec<String>,
}

impl Claims {
    pub fn user_id(&self) -> &str {
        self.oid.as_deref().unwrap_or(&self.sub)
    }
}

pub fn validate_endpoint(value: &str) -> anyhow::Result<()> {
    let url = url::Url::parse(value)?;
    let local = matches!(url.host_str(), Some("127.0.0.1" | "localhost" | "[::1]"));
    ensure!(
        url.scheme() == "https" || (url.scheme() == "http" && local),
        "endpoint requires HTTPS or loopback HTTP"
    );
    ensure!(
        url.host_str().is_some()
            && url.username().is_empty()
            && url.password().is_none()
            && url.fragment().is_none()
            && url.query().is_none(),
        "invalid endpoint"
    );
    Ok(())
}

impl Auth {
    pub async fn new(issuer: String, audience: String) -> anyhow::Result<Self> {
        validate_endpoint(&issuer)?;
        ensure!(!audience.trim().is_empty(), "API audience is required");
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .redirect(reqwest::redirect::Policy::none())
            .build()?;
        let discovery: Discovery = client
            .get(format!("{issuer}/.well-known/openid-configuration"))
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        ensure!(discovery.issuer == issuer, "OIDC issuer mismatch");
        validate_endpoint(&discovery.jwks_uri)?;
        let keys = client
            .get(&discovery.jwks_uri)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(Self(Arc::new(Inner {
            issuer,
            audience,
            jwks_url: discovery.jwks_uri,
            client,
            keys: RwLock::new((Instant::now(), keys)),
        })))
    }

    async fn verify(&self, token: &str) -> Result<Claims, StatusCode> {
        let header = decode_header(token).map_err(|_| StatusCode::UNAUTHORIZED)?;
        if header.alg != Algorithm::RS256 {
            return Err(StatusCode::UNAUTHORIZED);
        }
        let kid = header.kid.ok_or(StatusCode::UNAUTHORIZED)?;
        if self.0.keys.read().await.0.elapsed() >= Duration::from_secs(300) {
            let mut cache = self.0.keys.write().await;
            if cache.0.elapsed() >= Duration::from_secs(300) {
                let keys = self
                    .0
                    .client
                    .get(&self.0.jwks_url)
                    .send()
                    .await
                    .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?
                    .error_for_status()
                    .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?
                    .json()
                    .await
                    .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
                *cache = (Instant::now(), keys);
            }
        }
        let cache = self.0.keys.read().await;
        let key = DecodingKey::from_jwk(cache.1.find(&kid).ok_or(StatusCode::UNAUTHORIZED)?)
            .map_err(|_| StatusCode::UNAUTHORIZED)?;
        drop(cache);
        let mut validation = Validation::new(Algorithm::RS256);
        validation.set_required_spec_claims(&["exp", "iss", "aud", "sub"]);
        validation.set_issuer(&[&self.0.issuer]);
        validation.set_audience(&[&self.0.audience]);
        validation.validate_nbf = true;
        let claims = decode::<Claims>(token, &key, &validation)
            .map_err(|_| StatusCode::UNAUTHORIZED)?
            .claims;
        if !claims
            .scp
            .split_whitespace()
            .any(|scope| scope == "api-access")
        {
            return Err(StatusCode::FORBIDDEN);
        }
        Ok(claims)
    }
}

pub async fn authorize(
    State(auth): State<Auth>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let path = request.uri().path();
    let public = matches!(
        (request.method().as_str(), path),
        ("GET", "/healthz" | "/api/environment" | "/api/known-cards") | ("POST", "/api/dictionary")
    );
    if !public {
        let token = request
            .headers()
            .get(header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.strip_prefix("Bearer "))
            .ok_or(StatusCode::UNAUTHORIZED)?;
        let claims = auth.verify(token).await?;
        request.extensions_mut().insert(claims);
    }
    Ok(next.run(request).await)
}

pub struct ReadDecks(pub Claims);
pub struct CreateDeck(pub Claims);

fn require_role(parts: &Parts, role: &str) -> Result<Claims, StatusCode> {
    let claims = parts
        .extensions
        .get::<Claims>()
        .ok_or(StatusCode::UNAUTHORIZED)?;
    if !claims.roles.iter().any(|value| value == role) {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(claims.clone())
}

impl<S: Send + Sync> FromRequestParts<S> for ReadDecks {
    type Rejection = StatusCode;
    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, Self::Rejection> {
        require_role(parts, "readDecks").map(Self)
    }
}

impl<S: Send + Sync> FromRequestParts<S> for CreateDeck {
    type Rejection = StatusCode;
    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, Self::Rejection> {
        require_role(parts, "createDeck").map(Self)
    }
}
