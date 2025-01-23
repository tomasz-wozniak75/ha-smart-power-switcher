use chrono::{DateTime, TimeDelta, Utc};
use serde::Serialize;

pub type Currency = u32;

#[derive(Serialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "lowercase")]
pub enum PriceCategory {
    Min,
    Medium,
    Max,
}

#[derive(Serialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PricelistItem {
    #[serde(with = "chrono::serde::ts_milliseconds")]
    starts_at: DateTime<Utc>,
    #[serde(serialize_with = "crate::model::serialize_time_delta")]
    duration: TimeDelta,
    price: Currency,
    weight: Option<u32>,
    category: PriceCategory,
}

impl PricelistItem {
    pub fn new(
        starts_at: DateTime<Utc>,
        duration: TimeDelta,
        price: Currency,
        category: PriceCategory,
    ) -> Self {
        Self {
            starts_at,
            duration,
            price,
            weight: None,
            category,
        }
    }

    pub fn starts_at(&self) -> &DateTime<Utc> {
        &self.starts_at
    }

    pub fn duration(&self) -> &TimeDelta {
        &self.duration
    }

    pub fn price(&self) -> Currency {
        self.price
    }

    pub fn weight(&self) -> Option<u32> {
        self.weight
    }
}

#[cfg(test)]
mod tests {
    use chrono::{DateTime, TimeDelta};
    use serde_test::{assert_ser_tokens, Token};

    use crate::model::price_list::{PriceCategory, PricelistItem};

    #[test]
    fn pricelist_item_ser_test() {
        let pricelist_item = PricelistItem::new(
            DateTime::from_timestamp_millis(1737068749821).unwrap(),
            TimeDelta::milliseconds(12),
            1,
            PriceCategory::Medium,
        );
        let serialized = serde_json::to_string(&pricelist_item).unwrap();
        println!("Serialized object: {}", serialized);

        assert_ser_tokens(
            &pricelist_item,
            &[
                Token::Struct {
                    name: "PricelistItem",
                    len: 5,
                },
                Token::Str("startsAt"),
                Token::I64(1737068749821),
                Token::Str("duration"),
                Token::I64(12),
                Token::Str("price"),
                Token::U32(1),
                Token::Str("weight"),
                Token::None,
                Token::Str("category"),
                Token::UnitVariant {
                    name: "PriceCategory",
                    variant: "medium",
                },
                Token::StructEnd,
            ],
        );
    }
}
