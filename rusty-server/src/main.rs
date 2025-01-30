use std::sync::Arc;

use axum::{
    routing::{delete, get, post},
    Router,
};

use rusty_server::{
    cancel_consumption_plan, get_power_consumers, get_price_list,
    power_consumers::{HomeAssistantService, PowerConsumersService, SwitchActionsScheduler},
    price_list_providers::TariffSelectorPriceList,
    schedule_consumption_plan,
    settings::Settings,
    AppState, SharedState,
};
use tokio::sync::RwLock;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().with_max_level(tracing::Level::DEBUG).init();

    let settings = Settings::new().unwrap();
    let state = create_shared_state(&settings).await;

    let app = Router::new()
        .route("/pricelist/{date}", get(get_price_list))
        .route("/power-consumer", get(get_power_consumers))
        .route("/power-consumer/{power_consumer_id}/consumption-plan", post(schedule_consumption_plan))
        .route("/power-consumer/{power_consumer_id}/consumption-plan", delete(cancel_consumption_plan))
        .with_state(state);

    // run our app with hyper, listening globally on port 3000
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", &settings.application_port)).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn create_shared_state(settings: &Settings) -> SharedState {
    let home_assistant_service = Arc::new(HomeAssistantService::new(&settings.home_assistant_config));
    let mut switch_actions_scheduler = SwitchActionsScheduler::new(home_assistant_service.clone());
    let tariff_selector_price_list = Arc::new(TariffSelectorPriceList::new(settings.tariff_type.clone()));

    let state = Arc::new(RwLock::new(AppState {
        single_day_price_list: tariff_selector_price_list.clone(),
        power_consumers_service: PowerConsumersService::new(
            &settings.power_consumers,
            tariff_selector_price_list.clone(),
        ),
    }));

    switch_actions_scheduler.set_state(Some(state.clone()));
    let _ = &state
        .write()
        .await
        .power_consumers_service
        .set_switch_actions_scheduler(Some(Arc::new(switch_actions_scheduler)));

    state
}
