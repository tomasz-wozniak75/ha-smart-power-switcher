use std::sync::Arc;

use chrono::{DateTime, TimeDelta, Utc};

use crate::model::{AppError, PriceListItem};

use super::{commons::cut_off_time_from_date, SingleDayPriceList, TariffSelector};

/// Price list providers returns price list for single required day,
/// charging could span few days, this service takes as input time range
/// and collects price list items from potentially few daily price list into
/// one continuous price list which covers from_the_time - to_the_time.
/// It uses TariffSelector to get price list for required day.
/// It returns copy of each selected price list item because scheduler
/// applies weights to each price list item
pub struct TimePeriodPriceListService {
    single_day_price_list: Arc<TariffSelector>,
}

impl TimePeriodPriceListService {
    pub fn new(single_day_price_list: Arc<TariffSelector>) -> Self {
        Self { single_day_price_list }
    }

    pub fn get_price_list(
        &self,
        from_the_time: &DateTime<Utc>,
        to_the_time: &DateTime<Utc>,
    ) -> Result<Vec<PriceListItem>, AppError> {
        let from_the_day = cut_off_time_from_date(from_the_time);
        let to_the_day = cut_off_time_from_date(to_the_time);

        let mut price_list: Vec<PriceListItem> = Vec::new();
        let mut next_day = from_the_day;
        while next_day <= to_the_day {
            let single_day_price_list = self.single_day_price_list.get_price_list(&next_day)?;
            price_list.extend(
                single_day_price_list
                    .iter()
                    .filter(|item| {
                        (*item.starts_at() + *item.duration()) > *from_the_time && *item.starts_at() < *to_the_time
                    })
                    .cloned(),
            );
            next_day += TimeDelta::days(1);
        }

        Ok(price_list)
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use chrono::{DateTime, Local, TimeZone, Utc};

    use crate::price_list_providers::{TariffSelector, TariffTypes};

    use super::TimePeriodPriceListService;

    fn date_time(year: i32, month: u32, day: u32, hour: u32, min: u32) -> DateTime<Utc> {
        Local.with_ymd_and_hms(year, month, day, hour, min, 0).map(|dt| dt.with_timezone(&Utc)).unwrap()
    }

    fn create_time_period_price_list_service() -> TimePeriodPriceListService {
        TimePeriodPriceListService::new(Arc::new(TariffSelector::new(TariffTypes::W12)))
    }

    #[test]
    fn should_return_price_list_for_the_requested_period_in_single_day_price_list() {
        let time_period_price_list_service = create_time_period_price_list_service();

        let start_time = date_time(2024, 8, 24, 13, 30);
        let end_time = date_time(2024, 8, 24, 13, 45);
        let price_list = time_period_price_list_service.get_price_list(&start_time, &end_time).unwrap();
        assert_eq!(price_list.len(), 1)
    }

    #[test]
    fn should_return_price_list_for_the_requested_period_spanning_two_single_day_price_lists() {
        let time_period_price_list_service = create_time_period_price_list_service();

        let start_time = date_time(2024, 8, 24, 13, 30);
        let end_time = date_time(2024, 8, 24, 14, 45);
        let price_list = time_period_price_list_service.get_price_list(&start_time, &end_time).unwrap();
        assert_eq!(price_list.len(), 2)
    }

    #[test]
    fn should_return_price_list_for_the_requested_one_day_period() {
        let time_period_price_list_service = create_time_period_price_list_service();

        let start_time = date_time(2024, 8, 24, 13, 0);
        let end_time = date_time(2024, 8, 25, 13, 0);
        let price_list = time_period_price_list_service.get_price_list(&start_time, &end_time).unwrap();
        assert_eq!(price_list.len(), 24)
    }
}
