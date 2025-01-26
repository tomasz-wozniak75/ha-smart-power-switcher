use std::{cmp::Ordering, sync::Arc};

use chrono::{DateTime, Datelike, Local, TimeDelta, TimeZone, Timelike, Utc};
use uuid::Uuid;

use crate::{
    model::{
        AppError, ConsumptionPlan, ConsumptionPlanItem, ConsumptionPlanState, PowerConsumerModel, PricelistItem,
        SwitchAction, SwitchActionState,
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
    pub fn consumption_plan(&self) -> Option<&ConsumptionPlan> {
        self.consumption_plan.as_ref()
    }

    fn get_default_charging_finish_time() -> DateTime<Utc> {
        let now = Local::now();
        let default_finis_at = if now.hour() < 16 {
            now + TimeDelta::hours(2)
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

    pub fn cancel_consumption_plan(&mut self, now: DateTime<Utc>) -> PowerConsumerModel {
        use SwitchActionState::*;

        if let Some(consumption_plan) = &mut self.consumption_plan {
            if consumption_plan.state == ConsumptionPlanState::Processing {
                let switch_actions = consumption_plan
                    .consumption_plan_items
                    .iter_mut()
                    .flat_map(|consumption_plan_item| consumption_plan_item.switch_actions_mut())
                    .collect::<Vec<&mut SwitchAction>>();

                let consumption_plan_has_been_started = *switch_actions[0].state() == SwitchActionState::Executed;
                let previous_action_executed = consumption_plan_has_been_started;
                for switch_action in switch_actions {
                    if *switch_action.state() != Executed {
                        if previous_action_executed && !switch_action.switch_on {
                            switch_action.set_result(Some(
                                format!("Canceled at {}", now.with_timezone(&Local).format("%H:%M:%S")).to_owned(),
                            ));
                            switch_action.set_executed_at(Some(now));
                            switch_action.set_state(Executed);
                        } else {
                            switch_action.set_state(Canceled);
                        }
                    }
                }
                consumption_plan.state = if consumption_plan_has_been_started {
                    ConsumptionPlanState::Executed
                } else {
                    ConsumptionPlanState::Canceled
                };
                // todo following
                // this.savePowerConsumptionStats(this.consumptionPlan);
                // await this.homeAsistantService.switchDevice(this.haDeviceName, false);
                // await this.sendConsumptionPlanStateNotification();
            }
        }
        self.to_power_consumer_model()
    }

    fn compare_by_price_weight_and_start_at(a: &PricelistItem, b: &PricelistItem) -> Ordering {
        match a.price().cmp(&b.price()) {
            Ordering::Equal => match b.weight().cmp(&a.weight()) {
                Ordering::Equal => a.starts_at().cmp(&b.starts_at()),
                ordering_result => ordering_result,
            },
            ordering_result => ordering_result,
        }
    }

    fn compare_by_start_at(a: &ConsumptionPlanItem, b: &ConsumptionPlanItem) -> Ordering {
        a.price_list_item().starts_at().cmp(&b.price_list_item().starts_at())
    }

    fn apply_constraints_to_duration(
        price_list_item: &PricelistItem,
        start_from: &DateTime<Utc>,
        finish_at: &DateTime<Utc>,
    ) -> TimeDelta {
        let mut starts_at = price_list_item.starts_at();
        let mut end_at = &(*price_list_item.starts_at() + *price_list_item.duration());
        if starts_at < start_from && start_from < end_at {
            starts_at = start_from;
        }
        if starts_at < finish_at && finish_at < end_at {
            end_at = finish_at;
        }
        *end_at - *starts_at
    }

    fn select_price_list_items_for_consumption_plan(
        &self,
        consumption_duration: &TimeDelta,
        start_from: &DateTime<Utc>,
        finish_at: &DateTime<Utc>,
    ) -> Vec<ConsumptionPlanItem> {
        let mut price_list = self
            .time_period_price_list_service
            .get_price_list(start_from, finish_at);
        Self::calculate_price_items_weights(&mut price_list, start_from, finish_at);
        price_list.sort_by(Self::compare_by_price_weight_and_start_at);
        let mut current_consumption_duration = TimeDelta::milliseconds(0);
        let mut consumption_plan: Vec<ConsumptionPlanItem> = Vec::new();
        for price_list_item in price_list {
            let pricelist_item_duration =
                Self::apply_constraints_to_duration(&price_list_item, &start_from, &finish_at);
            if current_consumption_duration + pricelist_item_duration <= *consumption_duration {
                current_consumption_duration += pricelist_item_duration;
                consumption_plan.push(ConsumptionPlanItem::new(price_list_item, pricelist_item_duration));
            } else {
                let delta = consumption_duration.num_milliseconds() - current_consumption_duration.num_milliseconds();
                if delta > 0 {
                    consumption_plan.push(ConsumptionPlanItem::new(
                        price_list_item,
                        TimeDelta::milliseconds(delta),
                    ));
                }
                break;
            }
        }

        consumption_plan.sort_by(Self::compare_by_start_at);

        consumption_plan
    }

    fn calculate_price_items_weights(
        price_list: &mut Vec<PricelistItem>,
        start_from: &DateTime<Utc>,
        finish_at: &DateTime<Utc>,
    ) {
        let mut weights: Vec<i64> = vec![0i64; price_list.len()];
        let mut current_price_min = 0.0;
        let mut current_price_max = 0.0;
        let mut weight = 0i64;
        let mut weight_change_index = 0;

        let mut apply_weight = |from: usize, to: usize, weight: i64| {
            for j in from..to {
                weights[j] = weight;
            }
        };

        for i in 0..price_list.len() {
            let pricelist_item = &price_list[i];
            let item_price = pricelist_item.price_as_float();
            if current_price_min <= item_price && item_price <= current_price_max {
                weight += Self::apply_constraints_to_duration(pricelist_item, start_from, finish_at).num_minutes();
            } else {
                if i > 0 {
                    apply_weight(weight_change_index, i - 1, weight);
                }
                current_price_min = pricelist_item.price_as_float();
                current_price_max = current_price_min;
                weight_change_index = i;
                weight = Self::apply_constraints_to_duration(pricelist_item, start_from, finish_at).num_minutes();
            }
        }
        apply_weight(weight_change_index, price_list.len(), weight);
        weights
            .iter()
            .enumerate()
            .for_each(|(i, weight)| price_list[i].set_weight(*weight));
    }

    fn create_switch_actions(&self, consumption_plan_items: &mut Vec<ConsumptionPlanItem>, finish_at: &DateTime<Utc>) {
        let mut prev_consumption_plan_item: Option<&mut ConsumptionPlanItem> = None;
        let mut prev_item_is_adjecent = false;
        for consumption_item in consumption_plan_items.iter_mut() {
            let price_list_item = consumption_item.price_list_item();

            if let (Some(prev_consumption_plan_item), true) = (prev_consumption_plan_item, prev_item_is_adjecent) {
                let prev_pricelist_item = prev_consumption_plan_item.price_list_item();
                if (*prev_pricelist_item.starts_at() + *prev_pricelist_item.duration()) < *price_list_item.starts_at() {
                    prev_item_is_adjecent = false;
                    let start_at = *prev_pricelist_item.starts_at() + *prev_pricelist_item.duration();
                    prev_consumption_plan_item
                        .switch_actions_mut()
                        .push(SwitchAction::new(start_at, false));
                }
            }

            if consumption_item.duration() < price_list_item.duration() {
                if prev_item_is_adjecent {
                    let start_at = *price_list_item.starts_at() + *consumption_item.duration();
                    consumption_item
                        .switch_actions_mut()
                        .push(SwitchAction::new(start_at, false));
                    prev_item_is_adjecent = false;
                } else {
                    let pricelist_item_end = &(*price_list_item.starts_at() + *price_list_item.duration());
                    let forced_pricelist_item_end = if finish_at < pricelist_item_end {
                        finish_at
                    } else {
                        pricelist_item_end
                    };
                    let start_at = *forced_pricelist_item_end - *consumption_item.duration();
                    consumption_item
                        .switch_actions_mut()
                        .push(SwitchAction::new(start_at, true));
                    prev_item_is_adjecent = true;
                }
            } else {
                if !prev_item_is_adjecent {
                    let at = price_list_item.starts_at().clone();
                    consumption_item.switch_actions_mut().push(SwitchAction::new(at, true));
                    prev_item_is_adjecent = true;
                }
            }
            prev_consumption_plan_item = Some(consumption_item);
        }

        //there is at least one consumption plan item
        let last_consumption_plan_item = consumption_plan_items.last_mut().unwrap();
        if last_consumption_plan_item.switch_actions().is_empty()
            || last_consumption_plan_item.switch_actions().last().unwrap().switch_on()
        {
            let mut item_start_from = last_consumption_plan_item.price_list_item().starts_at();
            if last_consumption_plan_item.switch_actions().len() == 1 {
                item_start_from = last_consumption_plan_item.switch_actions_mut().first().unwrap().at();
            }
            let at = *item_start_from + *last_consumption_plan_item.duration();
            last_consumption_plan_item
                .switch_actions_mut()
                .push(SwitchAction::new(at, false));
        }
    }

    fn create_consumption_plan(
        &mut self,
        consumption_duration: &TimeDelta,
        start_from: &DateTime<Utc>,
        finish_at: &DateTime<Utc>,
    ) {
        let mut consumption_plan_items =
            self.select_price_list_items_for_consumption_plan(consumption_duration, start_from, finish_at);
        self.create_switch_actions(&mut consumption_plan_items, finish_at);

        self.consumption_plan = Some(ConsumptionPlan {
            id: Uuid::new_v4(),
            created_at: start_from.clone(),
            consumption_duration: consumption_duration.clone(),
            finish_at: finish_at.clone(),
            consumption_plan_items: consumption_plan_items,
            state: ConsumptionPlanState::Processing,
        });
    }

    fn switch_consumption_plan_state(consumption_plan: &mut ConsumptionPlan) {
        use ConsumptionPlanState::*;

        if consumption_plan.state == Processing {
            let mut has_scheduled_action = false;
            let all_switch_actions = consumption_plan
                .consumption_plan_items
                .iter_mut()
                .flat_map(|consumption_plan_item| consumption_plan_item.switch_actions_mut());

            for next_switch_action in all_switch_actions {
                if *next_switch_action.state() == SwitchActionState::Scheduled {
                    has_scheduled_action = true;
                    break;
                }
            }
            if !has_scheduled_action {
                consumption_plan.state = Executed;
            }
        }
    }

    fn execute_switch_action(switchAction: &mut SwitchAction) {
        use SwitchActionState::*;
        if *switchAction.state() == Scheduled {
            switchAction.set_state(Executed);
            //TODO self.homeAsistantService.switchDevice(this.haDeviceName, switchAction.switchOn);
            switchAction.set_result(Some("OK".to_owned()));
            println!("Switch action executed at {}", Utc::now().format("%Y %m %d %H:%M:%S"));
            //in case of call errorswitchAction.result = error.message;
        }
    }

    fn schedule_switch_actions(&mut self, now: &DateTime<Utc>) {
        let scheduling_threshold = *now + TimeDelta::minutes(1);

        let switch_actions: Vec<&mut SwitchAction> = self
            .consumption_plan
            .iter_mut()
            .flat_map(|cp| &mut cp.consumption_plan_items)
            .flat_map(|cpi| cpi.switch_actions_mut())
            .collect();

        for switch_action in switch_actions {
            if *switch_action.at() < scheduling_threshold {
                switch_action.set_at(now.clone());
                Self::execute_switch_action(switch_action);
                // Self::switch_consumption_plan_state(&mut self.consumption_plan.unwrap());
            } else {
                Self::execute_switch_action(switch_action);
                // Self::switch_consumption_plan_state(&mut self.consumption_plan.unwrap());
            }
        }
    }

    pub fn schedule_consumption_plan(
        &mut self,
        consumption_duration: TimeDelta,
        start_from: &DateTime<Utc>,
        finish_at: &DateTime<Utc>,
    ) -> Result<PowerConsumerModel, AppError> {
        if let Some(ConsumptionPlan {
            state: ConsumptionPlanState::Processing,
            ..
        }) = self.consumption_plan
        {
            return Err(AppError::user_error("Current plan needs to be canceled!"));
        }

        if consumption_duration.num_milliseconds() <= 0 {
            return Err(AppError::user_error("Consumption duration should be grater than zero!"));
        }

        if *finish_at <= Utc::now() {
            return Err(AppError::user_error(
                format!(
                    "Finish at should be in the future! Requested finish time: {}",
                    finish_at.format("%Y %m %d %H:%M:%S")
                )
                .as_str(),
            ));
        }

        if Utc::now() > (*finish_at - consumption_duration) {
            return Err(AppError::user_error(
                format!(
                    "Finish at is too early to execute required consumption duration time {} minutes!",
                    consumption_duration.num_minutes()
                )
                .as_str(),
            ));
        }
        self.create_consumption_plan(&consumption_duration, start_from, finish_at);
        self.schedule_switch_actions(start_from);

        Ok(self.to_power_consumer_model())
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use chrono::{DateTime, Local, TimeDelta, TimeZone, Utc};

    use crate::{
        model::{ConsumptionPlanItem, ConsumptionPlanState, SwitchAction, SwitchActionState},
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
            .flat_map(|cp| cp.switch_actions().iter())
            .collect()
    }

    #[test]
    fn consumption_plan_items_two_hours_in_the_night_in_w12() {
        let mut power_consumer = create_power_consumer();

        let start_time = date_time(2024, 8, 24, 19, 30);
        let end_time = date(2024, 8, 25);
        power_consumer.create_consumption_plan(&TimeDelta::minutes(90), &start_time, &end_time);
        let consumption_plan_items = &power_consumer.consumption_plan().unwrap().consumption_plan_items;

        println!("{}", serde_json::to_string(&consumption_plan_items).unwrap());
        assert_eq!(consumption_plan_items.len(), 2);

        let switch_actions = collect_switch_actions(&consumption_plan_items);
        println!("{}", serde_json::to_string(&switch_actions).unwrap());
        assert_eq!(switch_actions.len(), 2);
        assert_eq!(switch_actions[0].switch_on, true);
        assert_eq!(switch_actions[0].at(), &date_time(2024, 8, 24, 22, 0));

        assert_eq!(switch_actions[1].switch_on, false);
        assert_eq!(switch_actions[1].at(), &date_time(2024, 8, 24, 23, 30));
    }

    #[test]
    fn consumption_plan_items_one_hour_in_the_night_in_w12() {
        let mut power_consumer = create_power_consumer();

        let start_time = date_time(2024, 8, 24, 19, 30);
        let end_time = date_time(2024, 8, 24, 23, 0);
        power_consumer.create_consumption_plan(&TimeDelta::minutes(60), &start_time, &end_time);
        let consumption_plan_items = &power_consumer.consumption_plan().unwrap().consumption_plan_items;
        println!("{}", serde_json::to_string(&consumption_plan_items).unwrap());
        assert_eq!(consumption_plan_items.len(), 1);
        assert_eq!(consumption_plan_items.len(), 1);

        let switch_actions = collect_switch_actions(&consumption_plan_items);
        println!("{}", serde_json::to_string(&switch_actions).unwrap());
        assert_eq!(switch_actions.len(), 2);
        assert_eq!(switch_actions[0].switch_on, true);
        assert_eq!(switch_actions[0].at(), &date_time(2024, 8, 24, 22, 0));

        assert_eq!(switch_actions[1].switch_on, false);
        assert_eq!(switch_actions[1].at(), &date_time(2024, 8, 24, 23, 0));
    }

    #[test]
    fn consumption_plan_items_do_not_start_in_the_past() {
        let mut power_consumer = create_power_consumer();

        let start_time = date_time(2024, 8, 24, 23, 20);
        let end_time = date_time(2024, 8, 24, 23, 30);
        power_consumer.create_consumption_plan(&TimeDelta::minutes(5), &start_time, &end_time);
        let consumption_plan_items = &power_consumer.consumption_plan().unwrap().consumption_plan_items;
        println!("{}", serde_json::to_string(&consumption_plan_items).unwrap());
        assert_eq!(consumption_plan_items.len(), 1);

        let switch_actions = collect_switch_actions(&consumption_plan_items);
        println!("{}", serde_json::to_string(&switch_actions).unwrap());
        assert_eq!(switch_actions.len(), 2);
        assert_eq!(switch_actions[0].switch_on, true);
        //assert_eq!(switch_actions[0].at(), &date_time(2024, 8, 24, 23, 25));

        assert_eq!(switch_actions[1].switch_on, false);
        assert_eq!(switch_actions[1].at(), &date_time(2024, 8, 24, 23, 30));
    }

    #[test]
    fn consumption_plan_items_two_hours_one_in_the_noon_and_one_in_the_night_in_w12() {
        let mut power_consumer = create_power_consumer();

        let start_time = date_time(2024, 8, 24, 14, 0);
        let end_time = date_time(2024, 8, 24, 23, 0);
        power_consumer.create_consumption_plan(&TimeDelta::minutes(120), &start_time, &end_time);
        let consumption_plan_items = &power_consumer.consumption_plan().unwrap().consumption_plan_items;
        println!("{}", serde_json::to_string(&consumption_plan_items).unwrap());
        assert_eq!(consumption_plan_items.len(), 2);

        let switch_actions = collect_switch_actions(&consumption_plan_items);
        println!("{}", serde_json::to_string(&switch_actions).unwrap());
        assert_eq!(switch_actions.len(), 4);
        assert_eq!(switch_actions[0].switch_on, true);
        assert_eq!(switch_actions[0].at(), &date_time(2024, 8, 24, 14, 0));

        assert_eq!(switch_actions[1].switch_on, false);
        assert_eq!(switch_actions[1].at(), &date_time(2024, 8, 24, 15, 0));

        assert_eq!(switch_actions[2].switch_on, true);
        assert_eq!(switch_actions[2].at(), &date_time(2024, 8, 24, 22, 0));

        assert_eq!(switch_actions[3].switch_on, false);
        assert_eq!(switch_actions[3].at(), &date_time(2024, 8, 24, 23, 0));
    }

    #[test]
    fn consumption_plan_items_more_than_two_hours_one_in_noon_and_one_in_the_night_in_w12() {
        let mut power_consumer = create_power_consumer();

        let start_time = date_time(2024, 8, 24, 14, 0);
        let end_time = date_time(2024, 8, 24, 23, 0);
        power_consumer.create_consumption_plan(&TimeDelta::minutes(130), &start_time, &end_time);
        let consumption_plan_items = &power_consumer.consumption_plan().unwrap().consumption_plan_items;
        println!("{}", serde_json::to_string(&consumption_plan_items).unwrap());
        assert_eq!(consumption_plan_items.len(), 3);

        let switch_actions = collect_switch_actions(&consumption_plan_items);
        println!("{}", serde_json::to_string(&switch_actions).unwrap());
        assert_eq!(switch_actions.len(), 4);
        assert_eq!(switch_actions[0].switch_on, true);
        assert_eq!(switch_actions[0].at(), &date_time(2024, 8, 24, 14, 0));

        assert_eq!(switch_actions[1].switch_on, false);
        assert_eq!(switch_actions[1].at(), &date_time(2024, 8, 24, 15, 10));

        assert_eq!(switch_actions[2].switch_on, true);
        assert_eq!(switch_actions[2].at(), &date_time(2024, 8, 24, 22, 0));

        assert_eq!(switch_actions[3].switch_on, false);
        assert_eq!(switch_actions[3].at(), &date_time(2024, 8, 24, 23, 0));
    }

    #[test]
    fn consumption_plan_items_more_than_two_hours_two_in_the_night_in_w12_ten_in_the_noon() {
        let mut power_consumer = create_power_consumer();

        let start_time = date_time(2024, 8, 24, 14, 0);
        let end_time = date_time(2024, 8, 25, 0, 0);
        power_consumer.create_consumption_plan(&TimeDelta::minutes(130), &start_time, &end_time);
        let consumption_plan_items = &power_consumer.consumption_plan().unwrap().consumption_plan_items;
        println!("{}", serde_json::to_string(&consumption_plan_items).unwrap());
        assert_eq!(consumption_plan_items.len(), 3);

        let switch_actions = collect_switch_actions(&consumption_plan_items);
        println!("{}", serde_json::to_string(&switch_actions).unwrap());
        assert_eq!(switch_actions.len(), 4);
        assert_eq!(switch_actions[0].switch_on, true);
        assert_eq!(switch_actions[0].at(), &date_time(2024, 8, 24, 14, 50));

        assert_eq!(switch_actions[1].switch_on, false);
        assert_eq!(switch_actions[1].at(), &date_time(2024, 8, 24, 15, 0));

        assert_eq!(switch_actions[2].switch_on, true);
        assert_eq!(switch_actions[2].at(), &date_time(2024, 8, 24, 22, 0));

        assert_eq!(switch_actions[3].switch_on, false);
        assert_eq!(switch_actions[3].at(), &date_time(2024, 8, 25, 0, 0));
    }

    #[test]
    fn consumption_plan_items_more_than_two_hours_both_in_the_night_in_w12() {
        let mut power_consumer = create_power_consumer();

        let start_time = date_time(2024, 8, 24, 14, 0);
        let end_time = date_time(2024, 8, 25, 0, 0);

        power_consumer.create_consumption_plan(&TimeDelta::minutes(120), &start_time, &end_time);
        let consumption_plan_items = &power_consumer.consumption_plan().unwrap().consumption_plan_items;
        println!("{}", serde_json::to_string(&consumption_plan_items).unwrap());
        assert_eq!(consumption_plan_items.len(), 2);

        let switch_actions = collect_switch_actions(&consumption_plan_items);
        println!("{}", serde_json::to_string(&switch_actions).unwrap());
        assert_eq!(switch_actions.len(), 2);

        assert_eq!(switch_actions[0].switch_on, true);
        assert_eq!(switch_actions[0].at(), &date_time(2024, 8, 24, 22, 0));

        assert_eq!(switch_actions[1].switch_on, false);
        assert_eq!(switch_actions[1].at(), &date_time(2024, 8, 25, 0, 0));
    }

    #[test]
    fn cancel_consumption_plan_which_is_waiting_for_execution() {
        let mut power_consumer = create_power_consumer();

        let start_time = date_time(2024, 8, 24, 14, 0);
        let end_time = date_time(2024, 8, 25, 0, 0);
        power_consumer.create_consumption_plan(&TimeDelta::minutes(120), &start_time, &end_time);

        power_consumer.cancel_consumption_plan(date_time(2024, 8, 24, 12, 0));
        let consumption_plan = power_consumer.consumption_plan().unwrap();
        assert_eq!(consumption_plan.state, ConsumptionPlanState::Canceled);

        let switch_actions = collect_switch_actions(&consumption_plan.consumption_plan_items);
        assert_eq!(switch_actions.len(), 2);

        assert_eq!(*switch_actions[0].state(), SwitchActionState::Canceled);
        assert_eq!(switch_actions[0].at(), &date_time(2024, 8, 24, 22, 0));

        assert_eq!(*switch_actions[0].state(), SwitchActionState::Canceled);
        assert_eq!(switch_actions[1].at(), &date_time(2024, 8, 25, 0, 0));
    }
}
