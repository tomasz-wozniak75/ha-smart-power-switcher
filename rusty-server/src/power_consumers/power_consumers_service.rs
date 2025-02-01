use std::{collections::HashMap, sync::Arc};

use crate::{
    model::{AppError, PowerConsumerModel},
    price_list_providers::{TariffSelectorPriceList, TimePeriodPriceListService},
    settings::PowerConsumerConfig,
};
use chrono::{DateTime, TimeDelta, Utc};

use super::{power_consumer::PowerConsumer, HomeAssistantService, SwitchActionsScheduler};

/// PowerConsumersService has a map of PowerConsumers
/// Each PowerConsumer represents single Tuya switch.
/// PowerConsumersService handles request to schedule consumption plan or to cancel it
/// by selecting required power consumer and delegating request to it. Scheduling is done by PowerConsumer  
///
pub struct PowerConsumersService {
    switch_actions_scheduler: Option<Arc<SwitchActionsScheduler>>,
    power_consumers: HashMap<String, PowerConsumer>,
}

impl PowerConsumersService {
    pub fn new(
        power_consumers_config: &[PowerConsumerConfig],
        tariff_selector_price_list: Arc<TariffSelectorPriceList>,
        home_assistant_service: Arc<HomeAssistantService>,
    ) -> Self {
        let time_period_price_list_service = Arc::new(TimePeriodPriceListService::new(tariff_selector_price_list));
        Self {
            switch_actions_scheduler: None,
            power_consumers: power_consumers_config
                .iter()
                .map(|config| {
                    (
                        config.device_id.to_owned(),
                        PowerConsumer::new(
                            config.device_id.to_owned(),
                            config.name.to_owned(),
                            time_period_price_list_service.clone(),
                            home_assistant_service.clone(),
                        ),
                    )
                })
                .collect(),
        }
    }

    pub fn switch_actions_scheduler(&self) -> Option<&Arc<SwitchActionsScheduler>> {
        self.switch_actions_scheduler.as_ref()
    }

    pub fn set_switch_actions_scheduler(&mut self, switch_actions_scheduler: Option<Arc<SwitchActionsScheduler>>) {
        self.switch_actions_scheduler = switch_actions_scheduler;
    }

    pub fn get_power_consumer_mut(&mut self, power_consumer_id: &str) -> Option<&mut PowerConsumer> {
        self.power_consumers.get_mut(power_consumer_id)
    }

    pub fn get_power_consumers_model_list(&self) -> Vec<PowerConsumerModel> {
        self.power_consumers.values().map(|v| v.to_power_consumer_model()).collect()
    }

    pub async fn schedule_consumption_plan(
        &mut self,
        power_consumer_id: String,
        consumption_duration: TimeDelta,
        finish_at: &DateTime<Utc>,
    ) -> Result<PowerConsumerModel, AppError> {
        let switch_actions_scheduler = self.switch_actions_scheduler.as_ref().unwrap().clone();
        let power_consumer =
            self.power_consumers.get_mut(&power_consumer_id).ok_or(AppError::not_found("Power consumer not found"))?;
        power_consumer
            .schedule_consumption_plan(switch_actions_scheduler, consumption_duration, &Utc::now(), finish_at)
            .await
    }

    pub async fn cancel_consumption_plan(&mut self, power_consumer_id: String) -> Result<PowerConsumerModel, AppError> {
        let power_consumer =
            self.power_consumers.get_mut(&power_consumer_id).ok_or(AppError::not_found("Power consumer not found"))?;
        Ok(power_consumer.cancel_consumption_plan(Utc::now()).await)
    }
}
