use crate::{model::AppError, settings::HttpCallConfig};

use serde::Serialize;

#[derive(Serialize)]
struct EntityRef {
    entity_id: String,
}

pub struct HomeAssistantService {
    token: String,
    base_url: String,
}
impl HomeAssistantService {
    pub fn new(home_assistant_config: &HttpCallConfig) -> Self {
        Self { token: home_assistant_config.token.clone(), base_url: home_assistant_config.base_url.clone() }
    }

    pub async fn switch_device(&self, device_name: &str, switch_on: bool) -> Result<(), AppError> {
        if self.token.is_empty() {
            return Err(AppError::system_error("Home assistant authorization token is missing"));
        }

        let operation = if switch_on { "turn_on" } else { "turn_off" };
        let url = format!("{}/api/services/switch/{}", self.base_url, operation);
        let body = serde_json::to_string(&EntityRef { entity_id: device_name.to_owned() })
            .map_err(|e| AppError::system_error(&format!("Home assistant request serialization error: {}", e)))?;

        reqwest::Client::new()
            .post(url)
            .bearer_auth(&self.token)
            .body(body)
            .send()
            .await
            .map(|_| ())
            .map_err(|e| AppError::system_error(&format!("Request to switch device  failed: {}", e)))
    }
}
