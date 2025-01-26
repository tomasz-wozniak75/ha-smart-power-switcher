use chrono::{DateTime, Utc};

use crate::model::PriceListItem;

use super::{SingleDayPriceList, W12PriceListProvider};

pub enum TariffTypes {
    W12,
    DayAheadMarket,
}

/// TariffSelectorPriceList allows to configure application with one of two
/// possible tariff: day ahead market where each hour has different prise
/// or W12 where there is off peak price between 2pm - 6 am and 1pm-3pm and weekends
/// in peek hours have double price. This tariff is provided mainly for testing
/// cos price list fetch requires remote call.
///
pub struct TariffSelectorPriceList {
    current_tariff: TariffTypes,
    w12_price_list_provider: W12PriceListProvider,
}

impl TariffSelectorPriceList {
    pub fn new(current_tariff: TariffTypes) -> Self {
        Self {
            current_tariff,
            w12_price_list_provider: W12PriceListProvider {},
        }
    }
}

impl SingleDayPriceList for TariffSelectorPriceList {
    fn get_price_list(&self, for_day: &DateTime<Utc>) -> Vec<PriceListItem> {
        match self.current_tariff {
            TariffTypes::W12 => self.w12_price_list_provider.get_price_list(for_day),
            TariffTypes::DayAheadMarket => todo!(),
        }
    }
}
