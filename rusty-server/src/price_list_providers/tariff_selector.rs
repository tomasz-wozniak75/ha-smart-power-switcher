use std::sync::Arc;

use chrono::{DateTime, Utc};
use serde::Deserialize;

use crate::model::{AppError, PriceListItem};

use super::{DayAheadMarketPriceListProvider, SingleDayPriceList, W12PriceListProvider};

#[derive(Debug, Deserialize, Clone)]
pub enum TariffTypes {
    W12,
    DayAheadMarket,
}

/// TariffSelector allows to configure application with one of two
/// possible tariff: day ahead market where each hour has different prise
/// or W12 where there is off peak price between 2pm - 6 am and 1pm-3pm and weekends
/// in peek hours have double price. This tariff is provided mainly for testing
/// cos price list fetch requires remote call.
///
pub struct TariffSelector {
    current_tariff: TariffTypes,
    w12_price_list_provider: W12PriceListProvider,
    day_ahead_market_price_list_provider: DayAheadMarketPriceListProvider,
}

impl TariffSelector {
    pub fn new(current_tariff: TariffTypes) -> Self {
        Self {
            current_tariff,
            w12_price_list_provider: W12PriceListProvider {},
            day_ahead_market_price_list_provider: DayAheadMarketPriceListProvider::new(),
        }
    }
}

impl SingleDayPriceList for TariffSelector {
    fn get_price_list(&self, for_day: &DateTime<Utc>) -> Result<Arc<Vec<PriceListItem>>, AppError> {
        match self.current_tariff {
            TariffTypes::W12 => self.w12_price_list_provider.get_price_list(for_day),
            TariffTypes::DayAheadMarket => self.day_ahead_market_price_list_provider.get_price_list(for_day),
        }
    }
}
