use rusty_server::{power_consumers::HomeAssistantService, settings::Settings};

async fn switch_device_test(switch_to: bool) {
    let settings = Settings::new().unwrap();
    let home_assistant_service = HomeAssistantService::new(&settings.home_assistant_config);
    home_assistant_service.switch_device(&settings.power_consumers[1].device_id, switch_to).await.unwrap();
}

#[tokio::test]
async fn switch_device_on() {
    switch_device_test(true).await;
}

#[tokio::test]
async fn switch_device_off() {
    switch_device_test(false).await;
}
