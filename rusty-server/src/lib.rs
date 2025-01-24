pub mod model;
pub mod power_consumers;
pub mod price_list_providers;

use std::sync::{Arc, RwLock};

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json, Response},
};
use chrono::TimeDelta;
use chrono::{DateTime, Utc};
use model::AppError;
use power_consumers::PowerConsumersService;
use price_list_providers::{SingleDayPricelist, W12PricelistProvider};
use serde::Deserialize;

pub struct AppState {
    pub single_day_pricelist: W12PricelistProvider,
    pub power_consumers_service: PowerConsumersService,
}

pub type SharedState = Arc<RwLock<AppState>>;

pub async fn get_price_list(Path(date): Path<String>, State(state): State<SharedState>) -> Response {
    println!("date: {}", date);
    match parse_date_path_param(date) {
        Ok(date) => Json(&state.read().unwrap().single_day_pricelist.get_price_list(&date)).into_response(),
        Err(error) => (error.code(), Json(error)).into_response(),
    }
}

pub async fn get_power_consumers(State(state): State<SharedState>) -> Response {
    let app_state = state.read().unwrap();
    let power_consumers_model_list = &app_state.power_consumers_service.get_power_consumers_model_list();
    (StatusCode::OK, Json(power_consumers_model_list)).into_response()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleConsumptionPlanParams {
    #[serde(deserialize_with = "model::deserialize_time_delta")]
    pub consumption_duration: TimeDelta,
    #[serde(with = "chrono::serde::ts_milliseconds")]
    pub finish_at: DateTime<Utc>,
}

pub async fn schedule_consumption_plan(
    Path(power_consumer_id): Path<String>,
    Query(ScheduleConsumptionPlanParams {
        consumption_duration,
        finish_at,
    }): Query<ScheduleConsumptionPlanParams>,
    State(state): State<SharedState>,
) -> Response {
    state
        .write()
        .unwrap()
        .power_consumers_service
        .schedule_consumption_plan(power_consumer_id, consumption_duration, finish_at)
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
        .unwrap()
        .power_consumers_service
        .cancel_consumption_plan(power_consumer_id)
        .map(|pcm| (StatusCode::OK, Json(pcm)))
        .map_err(|e| (e.code(), Json(e)))
        .into_response()
}

fn parse_date_path_param(date: String) -> Result<DateTime<Utc>, AppError> {
    DateTime::parse_from_str(&(date + " 00:00:00 +00:00"), "%d-%m-%Y  %H:%M:%S %z")
        .map(|d| d.with_timezone(&Utc))
        .map_err(|_e| AppError::user_error("Input date has incorrect format"))
}

#[cfg(test)]
mod tests {
    use chrono::prelude::*;

    use crate::parse_date_path_param;

    #[test]
    fn parse_date_path_param_test() {
        println!(
            "parsed date : {}",
            parse_date_path_param("12-12-2024".to_owned()).unwrap()
        );
        assert_eq!(
            parse_date_path_param("12-12-2024".to_owned()).unwrap(),
            Utc.with_ymd_and_hms(2024, 12, 12, 0, 0, 0).unwrap(),
        );
    }
}
