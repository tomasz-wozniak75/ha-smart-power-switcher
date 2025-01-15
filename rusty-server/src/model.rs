mod model {

    use uuid::{uuid, Uuid};

    enum PriceCategory {
        Min,
        Medium,
        Max,
    }

    struct PricelistItem {
        starts_at: u32,
        duration: u32,
        price: u32,
        weight: Option<u32>,
        category: PriceCategory,
    }

    enum SwitchActionState {
        Scheduled,
        Executed,
        Canceled,
    }

    struct SwitchAction {
        at: u32,
        executed_at: Option<u32>,
        switch_on: bool,
        state: SwitchActionState,
        result: Option<String>,
    }

    struct ConsumptionPlanItem {
        pricelist_item: PricelistItem,
        duration: u32,
        switch_actions: Vec<SwitchAction>,
    }

    enum ConsumptionPlanState {
        Processing,
        Executed,
        Canceled,
    }

    struct ConsumptionPlan {
        id: Uuid,
        created_at: u32,
        consumption_duration: u32,
        finish_at: u32,
        consumption_plan_items: Vec<ConsumptionPlanItem>,
        state: ConsumptionPlanState,
    }

    struct PowerConsumerModel {
        id: Uuid,
        name: String,
        default_consumption_duration: Option<u32>,
        default_finish_at: Option<u32>,
        charging_status_url: Option<String>,
        consumption_plan: Option<ConsumptionPlan>,
    }
}
