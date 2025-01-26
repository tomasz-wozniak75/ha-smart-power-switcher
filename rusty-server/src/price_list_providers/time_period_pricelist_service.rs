use std::sync::Arc;

use chrono::{DateTime, TimeDelta, Utc};

use crate::model::PriceListItem;

use super::{commons::cut_off_time_from_date, SingleDayPriceList, TariffSelectorPriceList};

/// Price list providers returns price list for single required day,
/// charging could span few days, this service takes as input time range
/// and collects price list items from potentially few daily price list into
/// one continuous price list which covers from_the_time - to_the_time.
/// It uses TariffSelectorPriceList to get price list for required day.
/// It returns copy of each selected price list item because scheduler
/// applies weights to each price list item
pub struct TimePeriodPriceListService {
    single_day_price_list: Arc<TariffSelectorPriceList>,
}

impl TimePeriodPriceListService {
    pub fn new(single_day_price_list: Arc<TariffSelectorPriceList>) -> Self {
        Self { single_day_price_list }
    }

    pub fn get_price_list(&self, from_the_time: &DateTime<Utc>, to_the_time: &DateTime<Utc>) -> Vec<PriceListItem> {
        let from_the_day = cut_off_time_from_date(from_the_time);
        let to_the_day = cut_off_time_from_date(to_the_time);

        let mut price_list: Vec<PriceListItem> = Vec::new();
        let mut next_day = from_the_day.clone();
        while next_day <= to_the_day {
            let single_day_price_list = self.single_day_price_list.get_price_list(&next_day);
            price_list.extend(
                single_day_price_list
                    .iter()
                    .filter(|item| {
                        (*item.starts_at() + *item.duration()) > *from_the_time && *item.starts_at() < *to_the_time
                    })
                    .map(|item| item.clone()),
            );
            next_day += TimeDelta::days(1);
        }

        price_list
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use chrono::{DateTime, Local, TimeZone, Utc};

    use crate::price_list_providers::{TariffSelectorPriceList, TariffTypes};

    use super::TimePeriodPriceListService;

    fn date_time(year: i32, month: u32, day: u32, hour: u32, min: u32) -> DateTime<Utc> {
        Local
            .with_ymd_and_hms(year, month, day, hour, min, 0)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap()
    }

    fn create_time_period_price_list_service() -> TimePeriodPriceListService {
        TimePeriodPriceListService::new(Arc::new(TariffSelectorPriceList::new(TariffTypes::W12)))
    }

    #[test]
    fn time_period_pricelist_should_return_pricelist_for_the_requested_period_in_single_day_pricelist() {
        let time_period_price_list_service = create_time_period_price_list_service();

        let start_time = date_time(2024, 8, 24, 13, 30);
        let end_time = date_time(2024, 8, 24, 13, 45);
        let price_list = time_period_price_list_service.get_price_list(&start_time, &end_time);
        assert_eq!(price_list.len(), 1)
    }

    #[test]
    fn time_period_pricelist_should_return_pricelist_for_the_requested_period_spaning_two_single_day_pricelists() {
        let time_period_price_list_service = create_time_period_price_list_service();

        let start_time = date_time(2024, 8, 24, 13, 30);
        let end_time = date_time(2024, 8, 24, 14, 45);
        let price_list = time_period_price_list_service.get_price_list(&start_time, &end_time);
        assert_eq!(price_list.len(), 2)
    }

    #[test]
    fn time_period_pricelist_should_return_pricelist_for_the_requested_one_day_period() {
        let time_period_price_list_service = create_time_period_price_list_service();

        let start_time = date_time(2024, 8, 24, 13, 0);
        let end_time = date_time(2024, 8, 25, 13, 0);
        let price_list = time_period_price_list_service.get_price_list(&start_time, &end_time);
        assert_eq!(price_list.len(), 24)
    }
}
