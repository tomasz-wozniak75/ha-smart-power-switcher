use std::sync::{Arc, RwLock};

use axum::{
    routing::{delete, get, post},
    Router,
};

use rusty_server::{
    cancel_consumption_plan, get_power_consumers, get_price_list,
    power_consumers::PowerConsumersService,
    price_list_providers::{TariffSelectorPriceList, TariffTypes},
    schedule_consumption_plan, AppState,
};

#[tokio::main]
async fn main() {
    let tariff_selector_pricelist = Arc::new(TariffSelectorPriceList::new(TariffTypes::W12));
    let state = Arc::new(RwLock::new(AppState {
        single_day_pricelist: tariff_selector_pricelist.clone(),
        power_consumers_service: PowerConsumersService::new(tariff_selector_pricelist.clone()),
    }));

    tracing_subscriber::fmt().with_max_level(tracing::Level::DEBUG).init();

    let app = Router::new()
        .route("/pricelist/{date}", get(get_price_list))
        .route("/power-consumer", get(get_power_consumers))
        .route(
            "/power-consumer/{power_consumer_id}/consumption-plan",
            post(schedule_consumption_plan),
        )
        .route(
            "/power-consumer/{power_consumer_id}/consumption-plan",
            delete(cancel_consumption_plan),
        )
        .with_state(state);

    // run our app with hyper, listening globally on port 3000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
