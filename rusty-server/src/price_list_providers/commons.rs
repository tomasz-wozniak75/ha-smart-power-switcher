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
    use chrono::{Datelike, Local, Timelike, Utc};

    use super::cut_off_time_from_date;

    #[test]
    fn cut_off_time_from_date_test() {
        let now = Utc::now();
        println!("now: {}", now);
        let day = cut_off_time_from_date(&now).with_timezone(&Local);
        println!("day: {}", day);
        assert_eq!(
            (now.year(), now.month(), now.day()),
            (day.year(), day.month(), day.day())
        );
        assert_eq!((day.hour(), day.minute(), day.second()), (0, 0, 0));

        let day_with_next_cut_off = cut_off_time_from_date(&now);
        println!("day_with_next_cut_off: {}", day_with_next_cut_off);
        assert_eq!(day, day_with_next_cut_off);
    }
}
