use anyhow::ensure;
use base64::{Engine, engine::general_purpose::STANDARD};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Clone, Deserialize, Serialize)]
pub struct Settings {
    pub oidc: Oidc,
    pub app_origin: String,
    pub storage_directory: PathBuf,
    pub token_encryption_key: String,
    pub providers: Providers,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct Oidc {
    pub issuer: String,
    pub audience: String,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct Provider {
    pub base_url: String,
    pub api_key: String,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct Providers {
    pub openai: Provider,
    pub anthropic: Provider,
    pub google: Provider,
    pub xai: Provider,
    pub ideogram: Provider,
    pub elevenlabs: Provider,
}

impl Settings {
    pub fn validate(&self) -> anyhow::Result<()> {
        crate::middleware::auth::validate_endpoint(&self.oidc.issuer)?;
        ensure!(
            !self.oidc.audience.trim().is_empty(),
            "API audience is required"
        );
        crate::middleware::auth::validate_endpoint(&self.app_origin)?;
        let origin = url::Url::parse(&self.app_origin)?;
        ensure!(
            origin.origin().ascii_serialization() == self.app_origin,
            "app_origin must be an exact origin"
        );
        ensure!(
            self.storage_directory.is_absolute(),
            "storage_directory must be absolute"
        );
        ensure!(
            STANDARD.decode(&self.token_encryption_key)?.len() == 32,
            "token encryption key must contain 32 bytes"
        );
        [
            &self.providers.openai,
            &self.providers.anthropic,
            &self.providers.google,
            &self.providers.xai,
            &self.providers.ideogram,
            &self.providers.elevenlabs,
        ]
        .into_iter()
        .try_for_each(|provider| {
            crate::middleware::auth::validate_endpoint(&provider.base_url)?;
            ensure!(
                !provider.api_key.trim().is_empty(),
                "provider API key is required"
            );
            Ok(())
        })
    }
}
