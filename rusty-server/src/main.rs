use std::sync::Arc;

use axum::{
    routing::{delete, get, post},
    Router,
};

use rusty_server::{
    cancel_consumption_plan, get_power_consumers, get_price_list,
    power_consumers::{PowerConsumersService, SwitchActionsScheduler},
    price_list_providers::{TariffSelectorPriceList, TariffTypes},
    schedule_consumption_plan, AppState, SharedState,
};
use tokio::sync::RwLock;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().with_max_level(tracing::Level::DEBUG).init();

    let state = create_shared_state().await;

    let app = Router::new()
        .route("/pricelist/{date}", get(get_price_list))
        .route("/power-consumer", get(get_power_consumers))
        .route("/power-consumer/{power_consumer_id}/consumption-plan", post(schedule_consumption_plan))
        .route("/power-consumer/{power_consumer_id}/consumption-plan", delete(cancel_consumption_plan))
        .with_state(state);

    // run our app with hyper, listening globally on port 3000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn create_shared_state() -> SharedState {
    let var_name = SwitchActionsScheduler::new();
    let mut switch_actions_scheduler = var_name;
    let tariff_selector_price_list = Arc::new(TariffSelectorPriceList::new(TariffTypes::W12));

    let state = Arc::new(RwLock::new(AppState {
        single_day_price_list: tariff_selector_price_list.clone(),
        power_consumers_service: PowerConsumersService::new(tariff_selector_price_list.clone()),
    }));

    switch_actions_scheduler.set_state(Some(state.clone()));
    let _ = &state
        .write()
        .await
        .power_consumers_service
        .set_switch_actions_scheduler(Some(Arc::new(switch_actions_scheduler)));

    state
}
