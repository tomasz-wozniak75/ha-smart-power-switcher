use chrono::{DateTime, TimeDelta, Utc};
use serde::Serialize;

pub type Currency = i32;

#[derive(Serialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "lowercase")]
pub enum PriceCategory {
    Min,
    Medium,
    Max,
}

/// 24 PriceListItem makes daily price list, it has starting time and duration
/// duration is usually 1 hours, starting time + duration must be equal to the next
/// price list item start time
#[derive(Serialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PriceListItem {
    #[serde(with = "chrono::serde::ts_milliseconds")]
    starts_at: DateTime<Utc>,
    #[serde(serialize_with = "crate::model::serialize_time_delta")]
    duration: TimeDelta,
    price: Currency,
    weight: i64,
    category: PriceCategory,
}

impl PriceListItem {
    pub fn new(starts_at: DateTime<Utc>, duration: TimeDelta, price: Currency, category: PriceCategory) -> Self {
        Self {
            starts_at,
            duration,
            price,
            weight: 0,
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

    pub fn price_as_float(&self) -> f32 {
        let shift = 100000f32;
        ((self.price as f32 / shift * 100f32) as i32) as f32 / 100.0
    }

    pub fn weight(&self) -> i64 {
        self.weight
    }

    pub fn set_weight(&mut self, weight: i64) {
        self.weight = weight;
    }
}

#[cfg(test)]
mod tests {
    use chrono::{DateTime, TimeDelta};
    use serde_test::{assert_ser_tokens, Token};

    use crate::model::price_list::{PriceCategory, PriceListItem};

    #[test]
    fn pricelist_item_ser_test() {
        let pricelist_item = PriceListItem::new(
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
                    name: "PriceListItem",
                    len: 5,
                },
                Token::Str("startsAt"),
                Token::I64(1737068749821),
                Token::Str("duration"),
                Token::I64(12),
                Token::Str("price"),
                Token::I32(1),
                Token::Str("weight"),
                Token::I64(0),
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
