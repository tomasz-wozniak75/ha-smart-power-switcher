use std::sync::Arc;

use chrono::{DateTime, Datelike, Local, TimeZone, Utc};

use crate::model::{AppError, PriceListItem};

/// This traits should be implemented by price list providers
pub trait SingleDayPriceList {
    fn get_price_list(&self, for_day: &DateTime<Utc>) -> Result<Arc<Vec<PriceListItem>>, AppError>;
}

/// we need to convert datetime to local time zone to cut off time part - get time at the midnight
/// and next revert conversion to utc
pub fn cut_off_time_from_date(date_time: &DateTime<Utc>) -> DateTime<Utc> {
    let local_date_time = date_time.with_timezone(&Local);
    Local
        .with_ymd_and_hms(local_date_time.year(), local_date_time.month(), local_date_time.day(), 0, 0, 0)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap()
}

/// date needs to be parsed as date in the local time zone and next converted to utc
pub fn parse_date(date: String) -> Result<DateTime<Utc>, AppError> {
    DateTime::parse_from_str(&(date + " 00:00:00 +01:00"), "%d-%m-%Y  %H:%M:%S %z")
        .map(|d| d.with_timezone(&Utc))
        .map_err(|_e| AppError::user_error("Input date has incorrect format"))
}

#[cfg(test)]
mod tests {
    use chrono::{Datelike, Local, TimeZone, Timelike, Utc};

    use super::cut_off_time_from_date;
    use super::parse_date;

    #[test]
    fn cut_off_time_from_date_test() {
        let now = Utc.with_ymd_and_hms(2024, 1, 1, 23, 10, 0).unwrap();
        let local_now = now.with_timezone(&Local);
        println!("now: {}", local_now);
        let day = cut_off_time_from_date(&now).with_timezone(&Local);
        println!("day: {}", day);
        assert_eq!(
            (local_now.year(), local_now.month(), local_now.day()),
            (day.year(), day.month(), day.day()),
            "The day before cut off and after should be the same"
        );
        assert_eq!(
            (day.hour(), day.minute(), day.second()),
            (0, 0, 0),
            "After cut off local date time should time part equal to midnight"
        );

        let day_with_next_cut_off = cut_off_time_from_date(&now);
        assert_eq!(day, day_with_next_cut_off, "Second cut off should not change anything");
    }

    #[test]
    fn parse_date_path_param_test() {
        println!("parsed date : {}", parse_date("12-12-2024".to_owned()).unwrap());
        assert_eq!(parse_date("12-12-2024".to_owned()).unwrap(), Utc.with_ymd_and_hms(2024, 12, 11, 23, 0, 0).unwrap(),);
    }
}
