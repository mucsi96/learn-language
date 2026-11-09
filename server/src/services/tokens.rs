use crate::{
    error::{Error, Result},
    models::api_tokens,
};
use aes_gcm::{
    Aes256Gcm, KeyInit, Nonce,
    aead::{Aead, AeadCore, OsRng, rand_core::RngCore},
};
use base64::{
    Engine,
    engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD},
};
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, Set};
use serde::{Deserialize, Serialize};
use subtle::ConstantTimeEq;

#[derive(Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Scope {
    Dictionary,
    KnownCardsExport,
}

impl Scope {
    fn as_str(self) -> &'static str {
        match self {
            Self::Dictionary => "DICTIONARY",
            Self::KnownCardsExport => "KNOWN_CARDS_EXPORT",
        }
    }
}

#[derive(Deserialize)]
pub struct CreateToken {
    pub name: String,
    pub scope: Scope,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Token {
    id: i32,
    name: String,
    scope: String,
    created_at: chrono::NaiveDateTime,
    #[serde(skip_serializing_if = "Option::is_none")]
    token: Option<String>,
}

fn cipher(encoded_key: &str) -> Result<Aes256Gcm> {
    let key = STANDARD.decode(encoded_key).map_err(anyhow::Error::from)?;
    Aes256Gcm::new_from_slice(&key)
        .map_err(|_| Error::Internal(anyhow::anyhow!("Invalid token encryption key")))
}

fn decrypt(cipher: &Aes256Gcm, encrypted: &str) -> Result<String> {
    let payload = STANDARD.decode(encrypted).map_err(anyhow::Error::from)?;
    if payload.len() < 28 {
        return Err(Error::Internal(anyhow::anyhow!("Invalid encrypted token")));
    }
    let nonce: [u8; 12] = payload[..12].try_into().map_err(anyhow::Error::from)?;
    let plaintext = cipher
        .decrypt(&Nonce::from(nonce), &payload[12..])
        .map_err(|_| Error::Internal(anyhow::anyhow!("Token decryption failed")))?;
    String::from_utf8(plaintext).map_err(|error| Error::Internal(error.into()))
}

pub async fn list(db: &DatabaseConnection) -> Result<Vec<Token>> {
    Ok(api_tokens::Entity::find()
        .all(db)
        .await?
        .into_iter()
        .map(|row| Token {
            id: row.id,
            name: row.name,
            scope: row.scope,
            created_at: row.created_at,
            token: None,
        })
        .collect())
}

pub async fn create(
    db: &DatabaseConnection,
    encoded_key: &str,
    request: CreateToken,
) -> Result<Token> {
    if request.name.trim().is_empty() {
        return Err(Error::Invalid("name is required".into()));
    }
    let cipher = cipher(encoded_key)?;
    let bytes = {
        let mut bytes = [0u8; 48];
        OsRng.fill_bytes(&mut bytes);
        bytes
    };
    let token = URL_SAFE_NO_PAD.encode(bytes);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let encrypted = cipher
        .encrypt(&nonce, token.as_bytes())
        .map_err(|_| Error::Internal(anyhow::anyhow!("Token encryption failed")))?;
    let payload = nonce.iter().copied().chain(encrypted).collect::<Vec<_>>();
    let row = api_tokens::ActiveModel {
        name: Set(request.name),
        scope: Set(request.scope.as_str().into()),
        encrypted_token: Set(STANDARD.encode(payload)),
        created_at: Set(chrono::Utc::now().naive_utc()),
        ..Default::default()
    }
    .insert(db)
    .await?;
    Ok(Token {
        id: row.id,
        name: row.name,
        scope: row.scope,
        created_at: row.created_at,
        token: Some(token),
    })
}

pub async fn validate(
    db: &DatabaseConnection,
    encoded_key: &str,
    presented: &str,
    scope: Scope,
) -> Result<()> {
    let cipher = cipher(encoded_key)?;
    let rows = api_tokens::Entity::find().all(db).await?;
    let matched = rows
        .into_iter()
        .map(|row| {
            let plaintext = decrypt(&cipher, &row.encrypted_token)?;
            Ok((
                bool::from(presented.as_bytes().ct_eq(plaintext.as_bytes())),
                row.scope,
            ))
        })
        .collect::<Result<Vec<_>>>()?
        .into_iter()
        .find(|(matched, _)| *matched)
        .ok_or(Error::Unauthorized)?;
    if matched.1 != scope.as_str() {
        return Err(Error::Forbidden);
    }
    Ok(())
}
