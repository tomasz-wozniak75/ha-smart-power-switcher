mod model;

use axum::{extract::Path, response::Json};
use chrono::{DateTime, ParseError, Utc};
use model::PricelistItem;

pub async fn get_price_list(Path(date): Path<String>) -> Json<Vec<PricelistItem>> {
    println!("date: {}", date);
    let date = parse_date_path_param(date);
    Json(vec![
        PricelistItem::new(date.unwrap(), 12, 12),
        PricelistItem::new(Utc::now(), 14, 14),
    ])
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
