use chrono::{
    DateTime, Datelike, TimeDelta, Utc,
    Weekday::{Sat, Sun},
};

use crate::model::{Currency, PriceCategory, PricelistItem};

use super::{commons::cut_off_time_from_date, SingleDayPricelist};

const OFF_PEAK_PRICE: Currency = 80000;
const IN_PEAK_PRICE: Currency = 160000;
const ONE_HOUR: TimeDelta = TimeDelta::hours(1);

#[derive(Clone)]
pub struct W12PricelistProvider {}

impl W12PricelistProvider {
    fn map_hour_to_price(&self, hour: i32) -> (Currency, PriceCategory) {
        if hour < 6 || hour == 13 || hour == 14 || hour > 21 {
            (OFF_PEAK_PRICE, PriceCategory::Min)
        } else {
            (IN_PEAK_PRICE, PriceCategory::Max)
        }
    }
}

impl SingleDayPricelist for W12PricelistProvider {
    fn get_price_list(&self, for_day: &DateTime<Utc>) -> Vec<PricelistItem> {
        let for_day = cut_off_time_from_date(for_day);

        if for_day.weekday() == Sat || for_day.weekday() == Sun {
            (0..24)
                .into_iter()
                .map(|h| {
                    PricelistItem::new(
                        for_day + ONE_HOUR * h,
                        ONE_HOUR,
                        OFF_PEAK_PRICE,
                        PriceCategory::Min,
                    )
                })
                .collect()
        } else {
            (0..24)
                .into_iter()
                .map(|h| {
                    let (price, category) = self.map_hour_to_price(h);
                    PricelistItem::new(for_day + ONE_HOUR * h, ONE_HOUR, price, category)
                })
                .collect()
        }
    }
}

#[cfg(test)]
mod tests {
    use chrono::{Datelike, Local, Timelike, Utc};

    use crate::price_list_providers::cut_off_time_from_date;

    use super::{SingleDayPricelist, W12PricelistProvider};

    #[test]
    fn w12_pricelist_provider_test() {
        let price_list_provider = W12PricelistProvider {};
        let now = Utc::now();
        println!("now: {}", now);
        let for_day = cut_off_time_from_date(&now);
        println!("for_day: {}", for_day);
        let price_list = price_list_provider.get_price_list(&for_day);
        assert_eq!(price_list.len(), 24);
        assert_eq!(price_list[0].starts_at(), &for_day);
    }

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
