use std::{collections::HashMap, sync::Arc};

use crate::{
    model::{AppError, PowerConsumerModel},
    price_list_providers::{SingleDayPricelist, TariffSelectorPricelist},
};
use chrono::{DateTime, TimeDelta, Utc};

use super::power_consumer::PowerConsumer;

pub struct PowerConsumersService {
    single_day_price_list: Arc<TariffSelectorPricelist>,
    power_consumers: HashMap<String, PowerConsumer>,
}

impl PowerConsumersService {
    pub fn new(tariff_selector_pricelist: Arc<TariffSelectorPricelist>) -> Self {
        let mut this = Self {
            single_day_price_list: tariff_selector_pricelist,
            power_consumers: HashMap::new(),
        };

        let audi_chager_id = "switch.audi_charger_breaker_switch".to_owned();
        let audi_power_consumer = PowerConsumer::new(audi_chager_id, "Audi charger".to_owned());
        this.power_consumers
            .insert(audi_power_consumer.id().to_owned(), audi_power_consumer);

        let one_phase_switch_id = "switch.smart_plug_socket_1".to_owned();
        let one_phase_switch = PowerConsumer::new(one_phase_switch_id, "One phase switch".to_owned());
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
    ) -> Result<PowerConsumerModel, AppError> {
        let power_consumer = self.power_consumers.get_mut(&power_consumer_id);
        power_consumer
            .map(|pc| {
                pc.create_consumption_plan(consumption_duration, Utc::now(), finish_at);
                pc
            })
            .map(|power_consumer| power_consumer.to_power_consumer_model())
            .ok_or(AppError::not_found("Power consumer not found"))
    }

    pub fn cancel_consumption_plan(&mut self, power_consumer_id: String) -> Result<PowerConsumerModel, AppError> {
        self.power_consumers
            .get_mut(&power_consumer_id)
            .map(|pc| pc.cancel_consumption_plan())
            .ok_or(AppError::not_found("Power consumer not found"))
    }
}
