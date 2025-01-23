use chrono::{DateTime, Datelike, Local, TimeZone, Utc};

use crate::model::PricelistItem;

pub trait SingleDayPricelist {
    fn get_price_list(&self, for_day: &DateTime<Utc>) -> Vec<PricelistItem>;
}

pub fn cut_off_time_from_date(date_time: &DateTime<Utc>) -> DateTime<Utc> {
    let local_date_time = date_time.with_timezone(&Local);
    Local
        .with_ymd_and_hms(
            local_date_time.year(),
            local_date_time.month(),
            local_date_time.day(),
            0,
            0,
            0,
        )
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap()
}

#[cfg(test)]
mod tests {
    use chrono::{Datelike, Local, TimeZone, Timelike, Utc};

    use super::cut_off_time_from_date;

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
        assert_eq!(day, day_with_next_cut_off, "Second cut off should not change anythging");
    }
}
