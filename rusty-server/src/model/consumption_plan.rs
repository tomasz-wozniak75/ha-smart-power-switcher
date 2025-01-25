use chrono::{DateTime, TimeDelta, Utc};

use serde::Serialize;
use uuid::Uuid;

use super::PricelistItem;

#[derive(Serialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "lowercase")]
pub enum SwitchActionState {
    Scheduled,
    Executed,
    Canceled,
}

#[derive(Serialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SwitchAction {
    #[serde(with = "chrono::serde::ts_milliseconds")]
    pub at: DateTime<Utc>,
    #[serde(with = "chrono::serde::ts_milliseconds_option")]
    pub executed_at: Option<DateTime<Utc>>,
    pub switch_on: bool,
    pub state: SwitchActionState,
    pub result: Option<String>,
}

#[derive(Serialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConsumptionPlanItem {
    price_list_item: PricelistItem,
    #[serde(serialize_with = "crate::model::serialize_time_delta")]
    duration: TimeDelta,
    switch_actions: Vec<SwitchAction>,
}
impl ConsumptionPlanItem {
    pub fn new(price_list_item: PricelistItem, duration: TimeDelta) -> Self {
        Self {
            price_list_item,
            duration,
            switch_actions: Vec::new(),
        }
    }

    pub fn price_list_item(&self) -> &PricelistItem {
        &self.price_list_item
    }

    pub fn duration(&self) -> TimeDelta {
        self.duration
    }

    pub fn switch_actions_mut(&mut self) -> &mut Vec<SwitchAction> {
        &mut self.switch_actions
    }

    pub fn switch_actions(&self) -> &[SwitchAction] {
        &self.switch_actions
    }
}

#[derive(Serialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub enum ConsumptionPlanState {
    Processing,
    Executed,
    Canceled,
}

#[derive(Serialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConsumptionPlan {
    #[serde(serialize_with = "crate::model::serialize_uuid")]
    pub id: Uuid,
    #[serde(with = "chrono::serde::ts_milliseconds")]
    pub created_at: DateTime<Utc>,
    #[serde(serialize_with = "crate::model::serialize_time_delta")]
    pub consumption_duration: TimeDelta,
    #[serde(with = "chrono::serde::ts_milliseconds")]
    pub finish_at: DateTime<Utc>,
    pub consumption_plan_items: Vec<ConsumptionPlanItem>,
    pub state: ConsumptionPlanState,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PowerConsumerModel<'a> {
    id: String,
    name: String,
    #[serde(with = "chrono::serde::ts_milliseconds_option")]
    default_finish_at: Option<DateTime<Utc>>,
    #[serde(serialize_with = "crate::model::serialize_time_delta")]
    default_consumption_duration: TimeDelta,
    charging_status_url: Option<String>,
    consumption_plan: Option<&'a ConsumptionPlan>,
}
impl<'a> PowerConsumerModel<'a> {
    pub fn new(
        id: String,
        name: String,
        default_finish_at: DateTime<Utc>,
        default_consumption_duration: TimeDelta,
        consumption_plan: Option<&'a ConsumptionPlan>,
    ) -> Self {
        Self {
            id,
            name,
            default_consumption_duration: default_consumption_duration,
            default_finish_at: Some(default_finish_at),
            charging_status_url: None,
            consumption_plan,
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::model::*;
    use chrono::{DateTime, TimeDelta};
    use serde_test::{assert_ser_tokens, Token};
    use uuid::uuid;

    #[test]
    fn consumption_plan_ser_test() {
        const ID: &str = "67e55044-10b1-426f-9247-bb680e5fe0c8";
        let consumption_plan = ConsumptionPlan {
            id: uuid!(ID),
            created_at: DateTime::from_timestamp_millis(1737068749821).unwrap(),
            consumption_duration: TimeDelta::milliseconds(12),
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
                Token::I64(12),
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
