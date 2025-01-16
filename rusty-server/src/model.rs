use serde::Serialize;
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
    starts_at: u32,
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
    at: u32,
    executed_at: Option<u32>,
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

enum ConsumptionPlanState {
    Processing,
    Executed,
    Canceled,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct ConsumptionPlan {
    id: Uuid,
    created_at: u32,
    consumption_duration: u32,
    finish_at: u32,
    consumption_plan_items: Vec<ConsumptionPlanItem>,
    state: ConsumptionPlanState,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct PowerConsumerModel {
    id: Uuid,
    name: String,
    default_consumption_duration: Option<u32>,
    default_finish_at: Option<u32>,
    charging_status_url: Option<String>,
    consumption_plan: Option<ConsumptionPlan>,
}

#[cfg(test)]
mod tests {
    use crate::model::*;
    use serde_test::{assert_ser_tokens, Token};

    #[test]
    fn first_test() {
        let pricelist_item = PricelistItem {
            starts_at: 12,
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
                Token::U32(12),
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
}
