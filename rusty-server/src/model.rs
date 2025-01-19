use chrono::{DateTime, Utc};
use serde::{Serialize, Serializer};
use uuid::Uuid;

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PriceCategory {
    Min,
    Medium,
    Max,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct PricelistItem {
    #[serde(with = "chrono::serde::ts_milliseconds")]
    starts_at: DateTime<Utc>,
    duration: u32,
    price: u32,
    weight: Option<u32>,
    category: PriceCategory,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
enum SwitchActionState {
    Scheduled,
    Executed,
    Canceled,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct SwitchAction {
    #[serde(with = "chrono::serde::ts_milliseconds")]
    at: DateTime<Utc>,
    #[serde(with = "chrono::serde::ts_milliseconds_option")]
    executed_at: Option<DateTime<Utc>>,
    switch_on: bool,
    state: SwitchActionState,
    result: Option<String>,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct ConsumptionPlanItem {
    pricelist_item: PricelistItem,
    duration: u32,
    switch_actions: Vec<SwitchAction>,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
enum ConsumptionPlanState {
    Processing,
    Executed,
    Canceled,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct ConsumptionPlan {
    #[serde(serialize_with = "crate::model::serialize_uuid")]
    id: Uuid,
    #[serde(with = "chrono::serde::ts_milliseconds")]
    created_at: DateTime<Utc>,
    consumption_duration: u32,
    #[serde(with = "chrono::serde::ts_milliseconds")]
    finish_at: DateTime<Utc>,
    consumption_plan_items: Vec<ConsumptionPlanItem>,
    state: ConsumptionPlanState,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct PowerConsumerModel {
    #[serde(serialize_with = "crate::model::serialize_uuid")]
    id: Uuid,
    name: String,
    default_consumption_duration: Option<u32>,
    default_finish_at: Option<u32>,
    charging_status_url: Option<String>,
    consumption_plan: Option<ConsumptionPlan>,
}

pub fn serialize_uuid<S>(
    uuid_value: &Uuid,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_str(&uuid_value.as_hyphenated().to_string())
}

#[cfg(test)]
mod tests {
    use crate::model::*;
    use chrono::DateTime;
    use serde_test::{assert_ser_tokens, Token};
    use uuid::uuid;

    #[test]
    fn pricelist_item_ser_test() {
        let pricelist_item = PricelistItem {
            starts_at: DateTime::from_timestamp_millis(1737068749821).unwrap(),
            duration: 12,
            price: 1,
            weight: Some(12),
            category: PriceCategory::Medium,
        };

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
                Token::U32(12),
                Token::Str("price"),
                Token::U32(1),
                Token::Str("weight"),
                Token::Some,
                Token::U32(12),
                Token::Str("category"),
                Token::UnitVariant {
                    name: "PriceCategory",
                    variant: "medium",
                },
                Token::StructEnd,
            ],
        );
    }

    #[test]
    fn consumption_plan_ser_test() {
        const ID: &str = "67e55044-10b1-426f-9247-bb680e5fe0c8";
        let consumption_plan = ConsumptionPlan {
            id: uuid!(ID),
            created_at: DateTime::from_timestamp_millis(1737068749821).unwrap(),
            consumption_duration: 12,
            finish_at: DateTime::from_timestamp_millis(1737068749821).unwrap(),
            consumption_plan_items: Vec::new(),
            state: ConsumptionPlanState::Processing,
        };

        let serialized = serde_json::to_string(&consumption_plan).unwrap();
        println!("Serialized object: {}", serialized);

        assert_ser_tokens(
            &consumption_plan,
            &[
                Token::Struct {
                    name: "ConsumptionPlan",
                    len: 6,
                },
                Token::Str("id"),
                Token::Str(ID),
                Token::Str("createdAt"),
                Token::I64(1737068749821),
                Token::Str("consumptionDuration"),
                Token::U32(12),
                Token::Str("finishAt"),
                Token::I64(1737068749821),
                Token::Str("consumptionPlanItems"),
                Token::Seq { len: Some(0) },
                Token::SeqEnd,
                Token::Str("state"),
                Token::UnitVariant {
                    name: "ConsumptionPlanState",
                    variant: "processing",
                },
                Token::StructEnd,
            ],
        );
    }
}
