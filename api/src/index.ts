import { DateTimeUtils } from "./DateTimeUtils";
import { PricelistItem} from "./PricelistItem"

export { DateTimeUtils, PricelistItem };


export interface SwitchAction {
    at: number;
    switchOn: boolean;
}

export interface ConsumptionPlanItem {
    pricelistItem: PricelistItem;
    duration: number;
    switchActions: SwitchAction[];
}

export interface ConsumptionPlan {
    consumptionDuration: number;
    finishAt: number;
    consumptionPlanItems: ConsumptionPlanItem[];
    state: "processing" | "executed" | "canceled";
}

export interface PowerConsumerModel {
    id: string;
    name: string;
    defaultConsumptionDuration: number | undefined;
    defaultFinishAt: number | undefined;
    consumptionPlan: ConsumptionPlan | null;
}