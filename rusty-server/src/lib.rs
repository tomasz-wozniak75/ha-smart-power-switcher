pub mod model;
pub mod power_consumers;
pub mod price_list_providers;
pub mod settings;

use std::sync::Arc;
use tokio::sync::RwLock;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json, Response},
};
use chrono::TimeDelta;
use chrono::{DateTime, Utc};
use model::PriceListItem;
use power_consumers::PowerConsumersService;
use price_list_providers::{parse_date, SingleDayPriceList, TariffSelector};
use serde::Deserialize;

pub struct AppState {
    pub single_day_price_list: Arc<TariffSelector>,
    pub power_consumers_service: PowerConsumersService,
}

pub type SharedState = Arc<RwLock<AppState>>;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleConsumptionPlanParams {
    #[serde(deserialize_with = "model::deserialize_time_delta")]
    pub consumption_duration: TimeDelta,
    #[serde(with = "chrono::serde::ts_milliseconds")]
    pub finish_at: DateTime<Utc>,
}

pub async fn get_price_list(Path(date): Path<String>, State(state): State<SharedState>) -> Response {
    let app_state = state.read().await;
    parse_date(date)
        .and_then(|date| app_state.single_day_price_list.get_price_list(&date))
        .map(|price_list| price_list.iter().cloned().collect::<Vec<PriceListItem>>())
        .map(|price_list| (StatusCode::OK, Json(price_list)))
        .map_err(|error| (error.code(), Json(error)))
        .into_response()
}

pub async fn get_power_consumers(State(state): State<SharedState>) -> Response {
    let app_state = state.read().await;
    let power_consumers_model_list = &app_state.power_consumers_service.get_power_consumers_model_list();
    (StatusCode::OK, Json(power_consumers_model_list)).into_response()
}

pub async fn schedule_consumption_plan(
    Path(power_consumer_id): Path<String>,
    Query(ScheduleConsumptionPlanParams { consumption_duration, finish_at }): Query<ScheduleConsumptionPlanParams>,
    State(state): State<SharedState>,
) -> Response {
    state
        .write()
        .await
        .power_consumers_service
        .schedule_consumption_plan(power_consumer_id, consumption_duration, &finish_at)
        .await
        .map(|pcm| (StatusCode::OK, Json(pcm)))
        .map_err(|e| (e.code(), Json(e)))
        .into_response()
}

pub async fn cancel_consumption_plan(
    Path(power_consumer_id): Path<String>,
    State(state): State<SharedState>,
) -> Response {
    state
        .write()
        .await
        .power_consumers_service
        .cancel_consumption_plan(power_consumer_id)
        .await
        .map(|pcm| (StatusCode::OK, Json(pcm)))
        .map_err(|e| (e.code(), Json(e)))
        .into_response()
}
