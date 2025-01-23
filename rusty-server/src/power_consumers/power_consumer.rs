use chrono::{DateTime, Datelike, Local, TimeDelta, TimeZone, Timelike, Utc};
use uuid::Uuid;

use crate::model::{ConsumptionPlan, ConsumptionPlanState, PowerConsumerModel, SwitchAction, SwitchActionState};

#[derive(Clone)]
pub struct PowerConsumer {
    ha_device_name: String,
    name: String,
    consumption_plan: Option<ConsumptionPlan>,
}

impl PowerConsumer {
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

    pub fn new(ha_device_name: String, name: String) -> Self {
        Self {
            ha_device_name,
            name,
            consumption_plan: None,
        }
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
            self.consumption_plan.clone(),
        )
    }

    pub fn create_consumption_plan(&mut self, consumption_duration: TimeDelta, finish_at: DateTime<Utc>) {
        self.consumption_plan = Some(ConsumptionPlan {
            id: Uuid::new_v4(),
            created_at: Utc::now(),
            consumption_duration,
            finish_at,
            consumption_plan_items: Vec::new(),
            state: ConsumptionPlanState::Processing,
        });
    }

    pub fn cancel_consumption_plan(&mut self) -> PowerConsumerModel {
        use SwitchActionState::*;

        if let Some(consumption_plan) = &mut self.consumption_plan {
            if consumption_plan.state == ConsumptionPlanState::Processing {
                let switch_actions = consumption_plan
                    .consumption_plan_items
                    .iter_mut()
                    .flat_map(|consumption_pan_item| &mut consumption_pan_item.switch_actions)
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
mod tests {}
