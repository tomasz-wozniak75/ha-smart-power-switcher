pub mod model;
pub mod price_list_providers;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json, Response},
};
use chrono::{DateTime, ParseError, Utc};
use model::ErrorMessage;
use price_list_providers::{SingleDayPricelist, W12PricelistProvider};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pub single_day_pricelist: W12PricelistProvider,
}

pub async fn get_price_list(Path(date): Path<String>, State(state): State<AppState>) -> Response {
    println!("date: {}", date);
    match parse_date_path_param(date) {
        Ok(date) => Json(state.single_day_pricelist.get_price_list(&date)).into_response(),
        Err(error) => (
            StatusCode::BAD_REQUEST,
            Json(ErrorMessage {
                message: error.to_string(),
            }),
        )
            .into_response(),
    }
}

pub async fn get_power_consumers() -> Response {
    ().into_response()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsumptionDurationParam {
    pub consumption_duration: u32,
}
pub async fn schedule_consumption_plan(
    Path(power_consumer_id): Path<String>,
    Query(consumption_duration_param): Query<ConsumptionDurationParam>,
) -> Response {
    ().into_response()
}

pub async fn delete_consumption_plan(Path(power_consumer_id): Path<Uuid>) -> Response {
    ().into_response()
}

fn parse_date_path_param(date: String) -> Result<DateTime<Utc>, ParseError> {
    DateTime::parse_from_str(&(date + " 00:00:00 +00:00"), "%d-%m-%Y  %H:%M:%S %z")
        .map(|d| d.with_timezone(&Utc))
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
