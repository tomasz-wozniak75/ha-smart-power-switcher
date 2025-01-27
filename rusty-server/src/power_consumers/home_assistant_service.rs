use crate::model::AppError;

pub struct HomeAssistantService {
    ha_token: Option<String>,
    ha_url: Option<String>,
}
impl HomeAssistantService {
    pub fn new() -> Self {
        Self { ha_token: None, ha_url: None }
    }

    pub fn switch_device(&self, device_name: &str, switch_on: bool) -> Result<(), AppError> {
        Ok(())
    }
}
