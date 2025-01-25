use std::{rc::Rc, sync::Arc};

use chrono::{DateTime, Datelike, Local, TimeDelta, TimeZone, Timelike, Utc};
use uuid::Uuid;

use crate::{
    model::{
        ConsumptionPlan, ConsumptionPlanItem, ConsumptionPlanState, PowerConsumerModel, SwitchAction, SwitchActionState,
    },
    price_list_providers::TimePeriodPriceListService,
};

#[derive(Clone)]
pub struct PowerConsumer {
    ha_device_name: String,
    name: String,
    time_period_price_list_service: Arc<TimePeriodPriceListService>,
    consumption_plan: Option<ConsumptionPlan>,
}

impl PowerConsumer {
    pub fn new(
        ha_device_name: String,
        name: String,
        time_period_price_list_service: Arc<TimePeriodPriceListService>,
    ) -> Self {
        Self {
            ha_device_name,
            name,
            consumption_plan: None,
            time_period_price_list_service,
        }
    }

    fn get_default_charging_finish_time() -> DateTime<Utc> {
        let now = Local::now();
        let default_finis_at = if now.hour() < 16 {
            now + TimeDelta::hours(1) * 2
        } else {
            let tomorrow = now + TimeDelta::days(1);
            Local
                .with_ymd_and_hms(tomorrow.year(), tomorrow.month(), tomorrow.day(), 7, 0, 0)
                .unwrap()
        };
        default_finis_at.with_timezone(&Utc)
    }

    pub fn id(&self) -> &str {
        &self.ha_device_name
    }

    pub fn to_power_consumer_model(&self) -> PowerConsumerModel {
        PowerConsumerModel::new(
            self.ha_device_name.clone(),
            self.name.clone(),
            Self::get_default_charging_finish_time(),
            TimeDelta::minutes(90),
            self.consumption_plan.as_ref(),
        )
    }

    pub fn create_consumption_plan(
        &mut self,
        consumption_duration: TimeDelta,
        start_at: DateTime<Utc>,
        finish_at: DateTime<Utc>,
    ) -> Vec<ConsumptionPlanItem> {
        self.consumption_plan = Some(ConsumptionPlan {
            id: Uuid::new_v4(),
            created_at: Utc::now(),
            consumption_duration,
            finish_at,
            consumption_plan_items: Vec::new(),
            state: ConsumptionPlanState::Processing,
        });

        vec![]
    }

    pub fn cancel_consumption_plan(&mut self) -> PowerConsumerModel {
        use SwitchActionState::*;

        if let Some(consumption_plan) = &mut self.consumption_plan {
            if consumption_plan.state == ConsumptionPlanState::Processing {
                let switch_actions = consumption_plan
                    .consumption_plan_items
                    .iter_mut()
                    .flat_map(|consumption_plan_item| &mut consumption_plan_item.switch_actions)
                    .collect::<Vec<&mut SwitchAction>>();

                let consumption_plan_has_been_started = switch_actions[0].state == SwitchActionState::Executed;
                let previous_action_executed = consumption_plan_has_been_started;
                for switch_action in switch_actions {
                    if switch_action.state == Executed {
                        if previous_action_executed && !switch_action.switch_on {
                            let now = Utc::now();
                            switch_action.result = Some(
                                format!("Canceled at {}", now.with_timezone(&Local).format("%H:%M:%S")).to_owned(),
                            );
                            switch_action.executed_at = Some(now);
                            switch_action.state = Executed;
                        } else {
                            switch_action.state = Canceled;
                        }
                    }
                }
                consumption_plan.state = if consumption_plan_has_been_started {
                    ConsumptionPlanState::Executed
                } else {
                    ConsumptionPlanState::Canceled
                };
                // todo follwoing
                // this.savePowerConsumptionStats(this.consumptionPlan);
                // await this.homeAsistantService.switchDevice(this.haDeviceName, false);
                // await this.sendConsumptionPlanStateNotification();
            }
        }
        self.to_power_consumer_model()
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use chrono::{DateTime, Local, TimeDelta, TimeZone, Utc};

    use crate::{
        model::{ConsumptionPlanItem, SwitchAction},
        price_list_providers::{TariffSelectorPricelist, TariffTypes, TimePeriodPriceListService},
    };

    use super::PowerConsumer;

    fn create_power_consumer() -> PowerConsumer {
        PowerConsumer::new(
            "test.device".to_owned(),
            "Smart switch".to_owned(),
            Arc::new(TimePeriodPriceListService::new(Arc::new(TariffSelectorPricelist::new(
                TariffTypes::W12,
            )))),
        )
    }

    fn date_time(year: i32, month: u32, day: u32, hour: u32, min: u32) -> DateTime<Utc> {
        Local
            .with_ymd_and_hms(year, month, day, hour, min, 0)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap()
    }

    fn date(year: i32, month: u32, day: u32) -> DateTime<Utc> {
        date_time(year, month, day, 0, 0)
    }

    fn collect_switch_actions<'a>(consumption_plan_items: &'a Vec<ConsumptionPlanItem>) -> Vec<&'a SwitchAction> {
        consumption_plan_items
            .iter()
            .flat_map(|cp| cp.switch_actions.iter())
            .collect()
    }

    #[test]
    fn consumption_plan_items_two_hours_in_the_night_in_w12() {
        let mut power_consumer = create_power_consumer();

        let start_time = date_time(2024, 8, 24, 19, 30);
        let end_time = date(2024, 8, 25);
        let consumption_plan_items =
            power_consumer.create_consumption_plan(TimeDelta::minutes(90), start_time, end_time);
        println!("{}", serde_json::to_string(&consumption_plan_items).unwrap());
        assert_eq!(consumption_plan_items.len(), 2);

        let switch_actions = collect_switch_actions(&consumption_plan_items);
        println!("{}", serde_json::to_string(&switch_actions).unwrap());
        assert_eq!(switch_actions.len(), 2);
        assert_eq!(switch_actions[0].switch_on, true);
        assert_eq!(switch_actions[0].at, date_time(2024, 8, 24, 22, 0));

        assert_eq!(switch_actions[1].switch_on, false);
        assert_eq!(switch_actions[1].at, date_time(2024, 8, 24, 23, 30));
    }

    #[test]
    fn consumption_plan_items_one_hour_in_the_night_in_w12() {
        let mut power_consumer = create_power_consumer();

        let start_time = date_time(2024, 8, 24, 19, 30);
        let end_time = date_time(2024, 8, 24, 23, 0);
        let consumption_plan_items =
            power_consumer.create_consumption_plan(TimeDelta::minutes(60), start_time, end_time);
        println!("{}", serde_json::to_string(&consumption_plan_items).unwrap());
        assert_eq!(consumption_plan_items.len(), 1);
        assert_eq!(consumption_plan_items.len(), 1);

        let switch_actions = collect_switch_actions(&consumption_plan_items);
        println!("{}", serde_json::to_string(&switch_actions).unwrap());
        assert_eq!(switch_actions.len(), 2);
        assert_eq!(switch_actions[0].switch_on, true);
        assert_eq!(switch_actions[0].at, date_time(2024, 8, 24, 0, 0));

        assert_eq!(switch_actions[1].switch_on, false);
        assert_eq!(switch_actions[1].at, date_time(2024, 8, 24, 23, 0));
    }

    #[test]
    fn consumption_plan_items_do_not_start_in_the_past() {
        let mut power_consumer = create_power_consumer();

        let start_time = date_time(2024, 8, 24, 23, 20);
        let end_time = date_time(2024, 8, 24, 23, 30);
        let consumption_plan_items =
            power_consumer.create_consumption_plan(TimeDelta::minutes(5), start_time, end_time);
        println!("{}", serde_json::to_string(&consumption_plan_items).unwrap());
        assert_eq!(consumption_plan_items.len(), 1);

        let switch_actions = collect_switch_actions(&consumption_plan_items);
        println!("{}", serde_json::to_string(&switch_actions).unwrap());
        assert_eq!(switch_actions.len(), 2);
        assert_eq!(switch_actions[0].switch_on, true);
        assert_eq!(switch_actions[0].at, date_time(2024, 8, 24, 23, 25));

        assert_eq!(switch_actions[1].switch_on, false);
        assert_eq!(switch_actions[1].at, date_time(2024, 8, 24, 23, 30));
    }

    #[test]
    fn consumption_plan_items_two_hours_one_in_the_noon_and_one_in_the_night_in_w12() {
        let mut power_consumer = create_power_consumer();

        let start_time = date_time(2024, 8, 24, 14, 0);
        let end_time = date_time(2024, 8, 24, 23, 0);
        let consumption_plan_items =
            power_consumer.create_consumption_plan(TimeDelta::minutes(120), start_time, end_time);
        println!("{}", serde_json::to_string(&consumption_plan_items).unwrap());
        assert_eq!(consumption_plan_items.len(), 2);

        let switch_actions = collect_switch_actions(&consumption_plan_items);
        println!("{}", serde_json::to_string(&switch_actions).unwrap());
        assert_eq!(switch_actions.len(), 4);
        assert_eq!(switch_actions[0].switch_on, true);
        assert_eq!(switch_actions[0].at, date_time(2024, 8, 24, 14, 0));

        assert_eq!(switch_actions[1].switch_on, false);
        assert_eq!(switch_actions[1].at, date_time(2024, 8, 24, 15, 0));

        assert_eq!(switch_actions[2].switch_on, true);
        assert_eq!(switch_actions[2].at, date_time(2024, 8, 24, 22, 0));

        assert_eq!(switch_actions[3].switch_on, false);
        assert_eq!(switch_actions[3].at, date_time(2024, 8, 24, 23, 0));
    }

    #[test]
    fn consumption_plan_items_more_than_two_hour_one_in_noon_and_one_in_the_night_in_w12() {
        let mut power_consumer = create_power_consumer();

        let start_time = date_time(2024, 8, 24, 14, 0);
        let end_time = date_time(2024, 8, 24, 23, 0);
        let consumption_plan_items =
            power_consumer.create_consumption_plan(TimeDelta::minutes(130), start_time, end_time);
        println!("{}", serde_json::to_string(&consumption_plan_items).unwrap());
        assert_eq!(consumption_plan_items.len(), 3);

        let switch_actions = collect_switch_actions(&consumption_plan_items);
        println!("{}", serde_json::to_string(&switch_actions).unwrap());
        assert_eq!(switch_actions.len(), 4);
        assert_eq!(switch_actions[0].switch_on, true);
        assert_eq!(switch_actions[0].at, date_time(2024, 8, 24, 14, 0));

        assert_eq!(switch_actions[1].switch_on, false);
        assert_eq!(switch_actions[1].at, date_time(2024, 8, 24, 15, 10));

        assert_eq!(switch_actions[2].switch_on, true);
        assert_eq!(switch_actions[2].at, date_time(2024, 8, 24, 22, 0));

        assert_eq!(switch_actions[3].switch_on, false);
        assert_eq!(switch_actions[3].at, date_time(2024, 8, 24, 23, 0));
    }

    #[test]
    fn consumption_plan_items_more_than_two_hours_two_in_the_night_in_w12_ten_in_the_noon() {
        let mut power_consumer = create_power_consumer();

        let start_time = date_time(2024, 8, 24, 14, 0);
        let end_time = date_time(2024, 8, 25, 0, 0);
        let consumption_plan_items =
            power_consumer.create_consumption_plan(TimeDelta::minutes(130), start_time, end_time);
        println!("{}", serde_json::to_string(&consumption_plan_items).unwrap());
        assert_eq!(consumption_plan_items.len(), 3);

        let switch_actions = collect_switch_actions(&consumption_plan_items);
        println!("{}", serde_json::to_string(&switch_actions).unwrap());
        assert_eq!(switch_actions.len(), 4);
        assert_eq!(switch_actions[0].switch_on, true);
        assert_eq!(switch_actions[0].at, date_time(2024, 8, 24, 14, 50));

        assert_eq!(switch_actions[1].switch_on, false);
        assert_eq!(switch_actions[1].at, date_time(2024, 8, 24, 15, 0));

        assert_eq!(switch_actions[2].switch_on, true);
        assert_eq!(switch_actions[2].at, date_time(2024, 8, 24, 22, 0));

        assert_eq!(switch_actions[3].switch_on, false);
        assert_eq!(switch_actions[3].at, date_time(2024, 8, 25, 0, 0));
    }

    #[test]
    fn consumption_plan_items_more_than_two_hours_both_in_the_night_in_w12() {
        let mut power_consumer = create_power_consumer();

        let start_time = date_time(2024, 8, 24, 14, 0);
        let end_time = date_time(2024, 8, 25, 0, 0);
        let consumption_plan_items =
            power_consumer.create_consumption_plan(TimeDelta::minutes(120), start_time, end_time);
        println!("{}", serde_json::to_string(&consumption_plan_items).unwrap());
        assert_eq!(consumption_plan_items.len(), 2);

        let switch_actions = collect_switch_actions(&consumption_plan_items);
        println!("{}", serde_json::to_string(&switch_actions).unwrap());
        assert_eq!(switch_actions.len(), 2);

        assert_eq!(switch_actions[0].switch_on, true);
        assert_eq!(switch_actions[0].at, date_time(2024, 8, 24, 22, 0));

        assert_eq!(switch_actions[1].switch_on, false);
        assert_eq!(switch_actions[1].at, date_time(2024, 8, 25, 0, 0));
    }
}
