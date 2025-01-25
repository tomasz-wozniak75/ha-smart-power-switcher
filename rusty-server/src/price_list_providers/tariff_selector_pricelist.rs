use chrono::{DateTime, Utc};

use crate::model::PricelistItem;

use super::{SingleDayPricelist, W12PricelistProvider};

pub enum TariffTypes {
    W12,
    NextDayMarket,
}
pub struct TariffSelectorPricelist {
    current_tariff: TariffTypes,
    w12_pricelist_provider: W12PricelistProvider,
}

impl TariffSelectorPricelist {
    pub fn new(current_tariff: TariffTypes) -> Self {
        Self {
            current_tariff,
            w12_pricelist_provider: W12PricelistProvider {},
        }
    }
}

impl SingleDayPricelist for TariffSelectorPricelist {
    fn get_price_list(&self, for_day: &DateTime<Utc>) -> Vec<PricelistItem> {
        match self.current_tariff {
            TariffTypes::W12 => self.w12_pricelist_provider.get_price_list(for_day),
            TariffTypes::NextDayMarket => todo!(),
        }
    }
}
