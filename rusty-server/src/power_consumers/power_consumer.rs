use chrono::{DateTime, Datelike, Local, TimeDelta, TimeZone, Timelike, Utc};
use uuid::Uuid;

use crate::model::{ConsumptionPlan, ConsumptionPlanState, PowerConsumerModel};

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

    pub fn create_consumption_plan(
        &mut self,
        consumption_duration: TimeDelta,
        finish_at: DateTime<Utc>,
    ) {
        self.consumption_plan = Some(ConsumptionPlan {
            id: Uuid::new_v4(),
            created_at: Utc::now(),
            consumption_duration,
            finish_at,
            consumption_plan_items: Vec::new(),
            state: ConsumptionPlanState::Processing,
        });
    }
}
