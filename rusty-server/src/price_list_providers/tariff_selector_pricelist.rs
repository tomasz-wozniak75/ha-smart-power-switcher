use chrono::DateTime;

use crate::model::PricelistItem;

use super::{SingleDayPricelist, W12PricelistProvider};

pub enum TariffTypes {
    W12,
    NextDayMarket,
}
pub struct TariffSelectorPricelist {
    pub current_tariff: TariffTypes,
    pub w12_pricelist_provider: W12PricelistProvider,
}

impl SingleDayPricelist for TariffSelectorPricelist {
    fn get_price_list(&self, for_day: &DateTime<chrono::Utc>) -> Vec<PricelistItem> {
        match self.current_tariff {
            TariffTypes::W12 => self.w12_pricelist_provider.get_price_list(for_day),
            TariffTypes::NextDayMarket => todo!(),
        }
    }
}
