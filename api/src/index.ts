import { DateTimeUtils } from "./DateTimeUtils";
import { PricelistItem} from "./PricelistItem"

export { DateTimeUtils, PricelistItem };


export interface SwitchAction {
    at: number;
    switchOn: boolean;
    state: "scheduled" | "executed" | "canceled";
    result: string | undefined;
}

export interface ConsumptionPlanItem {
    pricelistItem: PricelistItem;
    duration: number;
    switchActions: SwitchAction[];
}

export interface ConsumptionPlan {
    id: string;
    createdAt: number;
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
    chargingStatusUrl: string | undefined; 
    consumptionPlan: ConsumptionPlan | null;
}


export class CurrencyUtils {
    static getPriceAsNumber(amount: number): number {
        const shift = 100000;
        return Math.trunc(Math.trunc(amount/shift*100))/100
    }

    static format(amount: number): string {
        
        return String(CurrencyUtils.getPriceAsNumber(amount));
    }
}



export interface BatteryStatus {
    carCapturedTimestamp: string,
    currentSOC_pct: number,
    cruisingRangeElectric_km:  number
}

export interface PlugStatus {
    carCapturedTimestamp: string,
    plugConnectionState: "disconnected" | "connected",
    plugLockState: "unlocked" | "locked",
    externalPower: "unavailable" | "ready",
    ledColor: "none" | "green"
}

export interface AudiMeasurements {
    electricRange: number,
    gasolineRange: number,
    currentFuelLevel_pct: number,
    currentSOC_pct: number,
    odometer: number,
} 

export interface ChargingStatus {
    batteryStatus: BatteryStatus,
    plugStatus: PlugStatus,
    measurements: AudiMeasurements
}