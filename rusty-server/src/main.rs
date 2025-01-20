use axum::{
    routing::{delete, get, post},
    Router,
};

use rusty_server::{
    delete_consumption_plan, get_power_consumers, get_price_list, schedule_consumption_plan,
};

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/pricelist/{date}", get(get_price_list))
        .route("/power-consumer", get(get_power_consumers))
        .route(
            "/power-consumer/{power_consumer_id}/consumption-plan",
            post(schedule_consumption_plan),
        )
        .route(
            "/power-consumer/{power_consumer_id}/consumption-plan",
            delete(delete_consumption_plan),
        );

    // run our app with hyper, listening globally on port 3000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
