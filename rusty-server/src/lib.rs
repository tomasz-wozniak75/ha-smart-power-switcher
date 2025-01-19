mod model;

use axum::{
    extract::Path,
    http::StatusCode,
    response::{IntoResponse, Json, Response},
};
use chrono::{DateTime, ParseError, Utc};
use model::{ErrorMessage, PricelistItem};

pub async fn get_price_list(Path(date): Path<String>) -> Response {
    println!("date: {}", date);
    match parse_date_path_param(date) {
        Ok(date) => Json(vec![
            PricelistItem::new(date, 12, 12),
            PricelistItem::new(Utc::now(), 14, 14),
        ])
        .into_response(),
        Err(error) => (
            StatusCode::BAD_REQUEST,
            Json(ErrorMessage {
                message: error.to_string(),
            }),
        )
            .into_response(),
    }
}

fn parse_date_path_param(date: String) -> Result<DateTime<Utc>, ParseError> {
    DateTime::parse_from_str(&(date + " 00:00:00 +01:00"), "%d-%m-%Y  %H:%M:%S %z")
        .map(|d| d.with_timezone(&Utc))
}

#[cfg(test)]
mod tests {
    use chrono::prelude::*;

    use crate::parse_date_path_param;

    #[test]
    fn parse_date_path_param_test() {
        assert_eq!(
            Local.with_ymd_and_hms(2024, 12, 12, 0, 0, 0).unwrap(),
            parse_date_path_param("12-12-2024".to_owned()).unwrap()
        );
    }
}
