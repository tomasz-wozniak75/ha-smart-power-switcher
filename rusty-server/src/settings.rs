use std::env;

use config::{Config, Environment, File};
use serde::Deserialize;

use crate::{model::AppError, price_list_providers::TariffTypes};
use dotenvy::dotenv;

#[derive(Debug, Deserialize)]
#[allow(unused)]
pub struct HttpCallConfig {
    pub base_url: String,
    pub token: String,
}

#[derive(Debug, Deserialize)]
#[allow(unused)]
pub struct PowerConsumerConfig {
    pub device_id: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[allow(unused)]
pub struct Settings {
    pub application_port: u16,
    pub tariff_type: TariffTypes,
    pub home_assistant_config: HttpCallConfig,
    pub power_consumers: Vec<PowerConsumerConfig>,
}

impl Settings {
    pub fn new() -> Result<Self, AppError> {
        dotenv().ok();

        let run_mode = env::var("RUN_MODE").unwrap_or_else(|_| "development".into());
        let _ = dotenvy::from_filename_override(format!(".env.{}", run_mode));

        let config = Config::builder()
            .add_source(File::with_name("settings"))
            .add_source(Environment::with_prefix("app").try_parsing(true).separator("."))
            .build()
            .map_err(|e| AppError::user_error(&format!("{}", e)))?;

        let settings = config.try_deserialize::<Settings>().map_err(|e| AppError::user_error(&format!("{}", e)))?;
        Ok(settings)
    }
}
