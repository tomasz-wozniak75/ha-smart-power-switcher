use crate::{model::AppError, settings::HttpCallConfig};

pub struct HomeAssistantService {
    token: String,
    base_url: String,
}
impl HomeAssistantService {
    pub fn new(home_assistant_config: &HttpCallConfig) -> Self {
        Self { token: home_assistant_config.token.clone(), base_url: home_assistant_config.base_url.clone() }
    }

    pub fn switch_device(&self, device_name: &str, switch_on: bool) -> Result<(), AppError> {
        Ok(())
    }
}
