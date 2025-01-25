use std::sync::Arc;

use super::TariffSelectorPricelist;

pub struct TimePeriodPricelistService {
    single_day_price_list: Arc<TariffSelectorPricelist>,
}

impl TimePeriodPricelistService {
    pub fn new(single_day_price_list: Arc<TariffSelectorPricelist>) -> Self {
        Self { single_day_price_list }
    }
}
