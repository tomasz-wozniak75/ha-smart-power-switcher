use std::collections::HashMap;

use chrono::{DateTime, Datelike, Local, TimeDelta, TimeZone, Timelike, Utc};

use crate::model::PowerConsumerModel;

#[derive(Clone)]
pub struct PowerConsumer {
    ha_device_name: String,
    name: String,
}

impl PowerConsumer {
    pub fn new(ha_device_name: String, name: String) -> Self {
        Self {
            ha_device_name,
            name,
        }
    }

    pub fn id(&self) -> &str {
        &self.ha_device_name
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

    fn to_power_consumer_model(&self) -> PowerConsumerModel {
        PowerConsumerModel::new(
            self.ha_device_name.clone(),
            self.name.clone(),
            Self::get_default_charging_finish_time(),
            TimeDelta::minutes(90),
        )
    }
}

#[derive(Clone)]
pub struct PowerConsumersService {
    power_consumers: HashMap<String, PowerConsumer>,
}

impl PowerConsumersService {
    pub fn new() -> Self {
        let mut this = Self {
            power_consumers: HashMap::new(),
        };

        let audi_chager_id = "switch.audi_charger_breaker_switch".to_owned();
        let audi_power_consumer = PowerConsumer::new(audi_chager_id, "Audi charger".to_owned());
        this.power_consumers
            .insert(audi_power_consumer.id().to_owned(), audi_power_consumer);

        let one_phase_switch_id = "switch.smart_plug_socket_1".to_owned();
        let one_phase_switch =
            PowerConsumer::new(one_phase_switch_id, "One phase switch".to_owned());
        this.power_consumers
            .insert(one_phase_switch.id().to_owned(), one_phase_switch);

        this
    }

    pub fn get_power_consumers_model_list(&self) -> Vec<PowerConsumerModel> {
        self.power_consumers
            .iter()
            .map(|(_, v)| v.to_power_consumer_model())
            .collect()
    }
}
