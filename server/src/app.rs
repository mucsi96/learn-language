use crate::{
    controllers, key_vault,
    middleware::{
        auth::{self, Auth},
        csrf,
    },
    settings::Settings,
};
use async_trait::async_trait;
use axum::{Extension, Router, middleware};
use loco_rs::{
    Result,
    app::{AppContext, Hooks},
    bgworker::Queue,
    boot::{self, BootResult, StartMode},
    config::Config,
    controller::{AppRoutes, Routes, monitoring},
    environment::Environment,
    task::Tasks,
};
use migration::Migrator;
use std::path::Path;

pub struct App;

#[async_trait]
impl Hooks for App {
    fn app_name() -> &'static str {
        env!("CARGO_PKG_NAME")
    }
    fn app_version() -> String {
        env!("CARGO_PKG_VERSION").into()
    }

    async fn load_config(environment: &Environment) -> Result<Config> {
        let config = environment.load()?;
        let mut config = if *environment == Environment::Production {
            let mut configured = config;
            key_vault::configure(&mut configured)
                .await
                .map_err(|error| loco_rs::Error::Any(error.into()))?;
            configured
        } else {
            config
        };
        config
            .settings::<Settings>()?
            .validate()
            .map_err(|error| loco_rs::Error::Any(error.into()))?;
        if config.database.dangerously_truncate || config.database.dangerously_recreate {
            return Err(loco_rs::Error::Message(
                "Destructive database startup is disabled".into(),
            ));
        }
        let mut uri = url::Url::parse(&config.database.uri).map_err(loco_rs::Error::wrap)?;
        uri.query_pairs_mut()
            .append_pair("options", "-csearch_path=learn_language");
        config.database.uri = uri.into();
        Ok(config)
    }

    async fn boot(
        mode: StartMode,
        environment: &Environment,
        config: Config,
    ) -> Result<BootResult> {
        boot::create_app::<Self, Migrator>(mode, environment, config).await
    }

    fn routes(_ctx: &AppContext) -> AppRoutes {
        controllers::routes(AppRoutes::empty())
            .add_route(Routes::new().get("/healthz", monitoring::readiness))
    }

    async fn after_routes(router: Router, ctx: &AppContext) -> Result<Router> {
        let settings: Settings = ctx.config.settings()?;
        let auth = Auth::new(settings.oidc.issuer.clone(), settings.oidc.audience.clone())
            .await
            .map_err(|error| loco_rs::Error::Any(error.into()))?;
        Ok(router
            .layer(Extension(settings.clone()))
            .layer(middleware::from_fn_with_state(auth, auth::authorize))
            .layer(middleware::from_fn_with_state(
                settings.app_origin,
                csrf::protect,
            )))
    }

    async fn connect_workers(_ctx: &AppContext, _queue: &Queue) -> Result<()> {
        Ok(())
    }
    fn register_tasks(_tasks: &mut Tasks) {}
    async fn truncate(_ctx: &AppContext) -> Result<()> {
        Err(loco_rs::Error::Message(
            "Database truncation is disabled".into(),
        ))
    }
    async fn seed(_ctx: &AppContext, _path: &Path) -> Result<()> {
        Err(loco_rs::Error::Message(
            "Database reseeding is disabled".into(),
        ))
    }
}
