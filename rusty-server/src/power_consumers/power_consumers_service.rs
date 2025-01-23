use std::collections::HashMap;

use crate::model::PowerConsumerModel;
use chrono::{DateTime, TimeDelta, Utc};

use super::power_consumer::PowerConsumer;

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

    pub fn schedule_consumption_plan(
        &mut self,
        power_consumer_id: String,
        consumption_duration: TimeDelta,
        finish_at: DateTime<Utc>,
    ) -> Result<PowerConsumerModel, &str> {
        let power_consumer = self.power_consumers.get_mut(&power_consumer_id);
        power_consumer
            .map(|pc| {
                pc.create_consumption_plan(consumption_duration, finish_at);
                pc
            })
            .map(|power_consumer| power_consumer.to_power_consumer_model())
            .ok_or("dada")
    }

    pub fn cancel_consumption_plan(
        &mut self,
        power_consumer_id: String,
    ) -> Result<PowerConsumerModel, &str> {
        self.power_consumers
            .get_mut(&power_consumer_id)
            .map(|pc| pc.cancel_consumption_plan())
            .ok_or("dada")
    }
}
