use crate::settings::{Oidc, Provider, Providers, Settings};
use anyhow::{Context, ensure};
use azure_identity::WorkloadIdentityCredential;
use azure_security_keyvault_secrets::SecretClient;
use loco_rs::config::Config;

pub async fn configure(config: &mut Config) -> anyhow::Result<()> {
    let endpoint =
        std::env::var("AZURE_KEYVAULT_ENDPOINT").context("AZURE_KEYVAULT_ENDPOINT is required")?;
    let client = SecretClient::new(&endpoint, WorkloadIdentityCredential::new(None)?, None)?;
    config.database.uri = database_uri(
        &secret(&client, "db-url").await?,
        &secret(&client, "db-username").await?,
        &secret(&client, "db-password").await?,
    )?;
    let settings = Settings {
        oidc: Oidc {
            issuer: format!(
                "https://login.microsoftonline.com/{}/v2.0",
                secret(&client, "tenant-id").await?
            ),
            audience: secret(&client, "api-client-id").await?,
        },
        app_origin: format!("https://{}", secret(&client, "hostname").await?),
        storage_directory: std::env::var("STORAGE_DIRECTORY")
            .context("STORAGE_DIRECTORY is required")?
            .into(),
        token_encryption_key: secret(&client, "token-encryption-key").await?,
        providers: Providers {
            openai: Provider {
                base_url: "https://api.openai.com".into(),
                api_key: secret(&client, "openai-api-key").await?,
            },
            anthropic: Provider {
                base_url: "https://api.anthropic.com".into(),
                api_key: secret(&client, "claude-api-key").await?,
            },
            google: Provider {
                base_url: "https://generativelanguage.googleapis.com".into(),
                api_key: secret(&client, "google-ai-api-key").await?,
            },
            xai: Provider {
                base_url: "https://api.x.ai".into(),
                api_key: secret(&client, "xai-api-key").await?,
            },
            ideogram: Provider {
                base_url: "https://api.ideogram.ai".into(),
                api_key: secret(&client, "ideogram-api-key").await?,
            },
            elevenlabs: Provider {
                base_url: "https://api.elevenlabs.io".into(),
                api_key: secret(&client, "eleven-labs-api-key").await?,
            },
        },
    };
    config.settings = Some(serde_json::to_value(settings)?);
    Ok(())
}

async fn secret(client: &SecretClient, name: &str) -> anyhow::Result<String> {
    let value = client
        .get_secret(name, None)
        .await?
        .into_model()?
        .value
        .with_context(|| format!("Key Vault secret {name} is empty"))?;
    ensure!(!value.trim().is_empty(), "Key Vault secret {name} is empty");
    Ok(value)
}

fn database_uri(value: &str, username: &str, password: &str) -> anyhow::Result<String> {
    let mut url = url::Url::parse(value.strip_prefix("jdbc:").unwrap_or(value))?;
    ensure!(
        matches!(url.scheme(), "postgres" | "postgresql"),
        "PostgreSQL URL required"
    );
    url.set_username(&username.replace('%', "%25"))
        .map_err(|_| anyhow::anyhow!("Invalid database username"))?;
    url.set_password(Some(&password.replace('%', "%25")))
        .map_err(|_| anyhow::anyhow!("Invalid database password"))?;
    Ok(url.into())
}
