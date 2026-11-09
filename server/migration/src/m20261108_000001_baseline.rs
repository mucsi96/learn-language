use sea_orm_migration::{
    prelude::*,
    sea_orm::{ConnectionTrait, DbBackend, Statement},
};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        let existing = db.query_one_raw(Statement::from_string(DbBackend::Postgres,
            "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'learn_language' AND tablename <> 'seaql_migrations') AS present"))
            .await?.ok_or_else(|| DbErr::Custom("Cannot inspect database schema".into()))?
            .try_get::<bool>("", "present")?;
        if !existing {
            db.execute_unprepared(include_str!("baseline.sql")).await?;
        }
        let signature = db
            .query_one_raw(Statement::from_string(
                DbBackend::Postgres,
                include_str!("schema_signature.sql"),
            ))
            .await?
            .ok_or_else(|| DbErr::Custom("Cannot inspect database schema".into()))?
            .try_get::<String>("", "signature")?;
        let actual: serde_json::Value =
            serde_json::from_str(&signature).map_err(|error| DbErr::Custom(error.to_string()))?;
        let expected: serde_json::Value =
            serde_json::from_str(include_str!("schema_signature.json"))
                .map_err(|error| DbErr::Custom(error.to_string()))?;
        if actual != expected {
            let mismatched = ["columns", "constraints", "indexes", "views", "sequences"]
                .into_iter()
                .filter(|key| actual[key] != expected[key])
                .collect::<Vec<_>>()
                .join(", ");
            return Err(DbErr::Custom(format!(
                "Database schema does not match the Rust baseline ({mismatched}). Upgrade with the preceding release before migrating; no existing data was modified."
            )));
        }
        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Err(DbErr::Custom(
            "The persisted application schema cannot be dropped by a rollback".into(),
        ))
    }
}
