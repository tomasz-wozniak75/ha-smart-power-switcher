use chrono::{DateTime, TimeDelta, Utc};

use serde::Serialize;
use uuid::Uuid;

use super::PriceListItem;

#[derive(Serialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "lowercase")]
pub enum SwitchActionState {
    Scheduled,
    Executed,
    Canceled,
}

/// Switch actions are connected to ConsumptionPlanItem,
/// single switch action represents switch event
#[derive(Serialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SwitchAction {
    #[serde(with = "chrono::serde::ts_milliseconds")]
    at: DateTime<Utc>,
    pub switch_on: bool,
    state: SwitchActionState,
    #[serde(with = "chrono::serde::ts_milliseconds_option")]
    executed_at: Option<DateTime<Utc>>,
    result: Option<String>,
}

impl SwitchAction {
    pub fn new(at: DateTime<Utc>, switch_on: bool) -> Self {
        Self {
            at: at,
            switch_on,
            state: SwitchActionState::Scheduled,
            executed_at: None,
            result: None,
        }
    }

    pub fn at(&self) -> &DateTime<Utc> {
        &self.at
    }

    pub fn switch_on(&self) -> bool {
        self.switch_on
    }

    pub fn state(&self) -> &SwitchActionState {
        &self.state
    }

    pub fn set_result(&mut self, result: Option<String>) {
        self.result = result;
    }

    pub(crate) fn set_executed_at(&mut self, executed_at: Option<DateTime<Utc>>) {
        self.executed_at = executed_at;
    }

    pub(crate) fn set_state(&mut self, state: SwitchActionState) {
        self.state = state;
    }

    pub(crate) fn set_at(&mut self, at: DateTime<Utc>) {
        self.at = at;
    }
}

///ConsumptionPlanItem has one to one relation with price list item,
/// its duration can not be longer than price lis item duration
/// It could have switch action between 0 and 2, first consumption item
/// for sure will have action to start charging, the last one to finish it,
/// if consumption plan has breaks other consumption plan item could have switch
/// action as well to handle breaks.
#[derive(Serialize, Debug, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConsumptionPlanItem {
    price_list_item: PriceListItem,
    #[serde(serialize_with = "crate::model::serialize_time_delta")]
    duration: TimeDelta,
    switch_actions: Vec<SwitchAction>,
}
impl ConsumptionPlanItem {
    pub fn new(price_list_item: PriceListItem, duration: TimeDelta) -> Self {
        Self {
            price_list_item,
            duration,
            switch_actions: Vec::new(),
        }
    }

    pub fn price_list_item(&self) -> &PriceListItem {
        &self.price_list_item
    }

    pub fn duration(&self) -> &TimeDelta {
        &self.duration
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

///ConsumptionPlan is composed from  ConsumptionPlanItems
/// ConsumptionPlan duration should be equal to the sum of
/// all its ConsumptionPlanItems durations
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
