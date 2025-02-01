use chrono::{
    DateTime, Datelike, Local, TimeDelta, Utc,
    Weekday::{Sat, Sun},
};

use crate::model::{Currency, PriceCategory, PriceListItem};

use super::{commons::cut_off_time_from_date, SingleDayPriceList};

const OFF_PEAK_PRICE: Currency = 80000;
const IN_PEAK_PRICE: Currency = 160000;
const ONE_HOUR: TimeDelta = TimeDelta::hours(1);

///W12 is a tariff with off peak hours where price is low,
/// it is between 2pm - 6 am and 1pm-3pm, weekends are in off peek prices
/// In peek hours have double price. This tariff is provided mainly for testing
#[derive(Clone)]
pub struct W12PriceListProvider {}

impl W12PriceListProvider {
    fn map_hour_to_price(&self, hour: i32) -> (Currency, PriceCategory) {
        if hour < 6 || hour == 13 || hour == 14 || hour > 21 {
            (OFF_PEAK_PRICE, PriceCategory::Min)
        } else {
            (IN_PEAK_PRICE, PriceCategory::Max)
        }
    }
}

impl SingleDayPriceList for W12PriceListProvider {
    fn get_price_list(&self, for_day: &DateTime<Utc>) -> Vec<PriceListItem> {
        let for_day = cut_off_time_from_date(for_day);
        let local_date = for_day.with_timezone(&Local);

        if local_date.weekday() == Sat || local_date.weekday() == Sun {
            (0..24)
                .map(|h| PriceListItem::new(for_day + ONE_HOUR * h, ONE_HOUR, OFF_PEAK_PRICE, PriceCategory::Min))
                .collect()
        } else {
            (0..24)
                .map(|h| {
                    let (price, category) = self.map_hour_to_price(h);
                    PriceListItem::new(for_day + ONE_HOUR * h, ONE_HOUR, price, category)
                })
                .collect()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::cut_off_time_from_date;
    use super::{SingleDayPriceList, W12PriceListProvider};
    use chrono::Utc;

    #[test]
    fn w12_price_list_provider_test() {
        let price_list_provider = W12PriceListProvider {};
        let now = Utc::now();
        println!("now: {}", now);
        let for_day = cut_off_time_from_date(&now);
        println!("for_day: {}", for_day);
        let price_list = price_list_provider.get_price_list(&for_day);
        assert_eq!(price_list.len(), 24);
        assert_eq!(price_list[0].starts_at(), &for_day);
    }
}
