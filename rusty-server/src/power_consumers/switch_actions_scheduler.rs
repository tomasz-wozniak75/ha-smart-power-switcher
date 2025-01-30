use std::sync::Arc;

use chrono::{DateTime, Local, TimeDelta, Utc};

use crate::{
    model::{ConsumptionPlan, ConsumptionPlanState, SwitchAction, SwitchActionState},
    SharedState,
};

use super::home_assistant_service::HomeAssistantService;

pub struct SwitchActionsScheduler {
    state: Option<SharedState>,
    home_assistant_service: Arc<HomeAssistantService>,
}

impl SwitchActionsScheduler {
    pub fn new(home_assistant_service: Arc<HomeAssistantService>) -> Self {
        Self { state: None, home_assistant_service }
    }

    pub fn set_state(&mut self, state: Option<SharedState>) {
        self.state = state;
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

    fn execute_switch_action(
        home_assistant_service: &HomeAssistantService,
        power_consumer_id: &str,
        switch_action: &mut SwitchAction,
    ) {
        use SwitchActionState::*;

        if *switch_action.state() == Scheduled {
            switch_action.set_state(Executed);
            let _ = home_assistant_service
                .switch_device(power_consumer_id, switch_action.switch_on())
                .map(|()| {
                    switch_action.set_result(Some("OK".to_owned()));
                    println!("Switch action executed at {}", Local::now().format("%Y %m %d %H:%M:%S"));
                })
                .map_err(|app_error| {
                    switch_action.set_result(Some(app_error.to_string()));
                });
        }
    }

    async fn spawn_scheduled_task_for_switch_action(
        state: SharedState,
        home_assistant_service: Arc<HomeAssistantService>,
        power_consumer_id: String,
        switch_action_id: String,
        sleep_for: u64,
    ) {
        use std::time::Duration;
        use tokio::time::sleep;

        sleep(Duration::from_millis(sleep_for)).await;

        let power_consumers_service = &mut state.write().await.power_consumers_service;
        if let Some(power_consumer) = power_consumers_service.get_power_consumer_mut(&power_consumer_id) {
            if let Some(consumption_plan) = power_consumer.consumption_plan_mut() {
                if let Some(switch_action) = consumption_plan.get_switch_action_by_id_mut(&switch_action_id) {
                    Self::execute_switch_action(&home_assistant_service, &power_consumer_id, switch_action);
                    Self::switch_consumption_plan_state(consumption_plan);
                }
            }
        }
    }

    pub fn schedule_switch_actions(
        &self,
        ha_device_name: &String,
        consumption_plan: &mut ConsumptionPlan,
        now: &DateTime<Utc>,
    ) {
        let scheduling_threshold = *now + TimeDelta::seconds(15);
        let power_consumer_id = ha_device_name.clone();
        let mut switch_executed_without_scheduling = false;

        for switch_action in consumption_plan.flat_switch_actions_mut() {
            if *switch_action.at() < scheduling_threshold {
                switch_action.set_at(*now);
                switch_executed_without_scheduling = true;
                Self::execute_switch_action(&self.home_assistant_service, &power_consumer_id, switch_action);
            } else {
                let sleep_for = (*switch_action.at() - Utc::now()).num_milliseconds() as u64;
                tokio::spawn(Self::spawn_scheduled_task_for_switch_action(
                    self.state.as_ref().unwrap().clone(),
                    self.home_assistant_service.clone(),
                    power_consumer_id.clone(),
                    switch_action.id().as_hyphenated().to_string().clone(),
                    sleep_for,
                ));
            }
        }
        if switch_executed_without_scheduling {
            Self::switch_consumption_plan_state(consumption_plan);
        }
    }
}
