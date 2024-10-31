import { ChargingStatus, ConsumptionPlan, DateTimeUtils } from "smart-power-consumer-api";
import { UserError } from "../../services/UserError";
import { AudiService } from "./AudiService";
import { ExeutionResult } from "./JobService";
import fs from 'node:fs';

export class ChargingTrackerService extends AudiService {

    private chargingStatus: ChargingStatus | null = null;
    private allowedBatteryChargingLevel: number = 80;
    private consumptionPlan: ConsumptionPlan | null = null;
    private ownConsumptionPlanId: string | null = null;
    private currentDay?: number;

    private audiChagerId = "switch.audi_charger_breaker_switch";
    private smartEnergyUrl = process.env.smartEnergyUrl;

    public constructor(interval: number = 15 * 60 * 1000) {
        super("charging-tracker", interval);
    }

    public getChargingStatus(): ChargingStatus | null {
        return this.chargingStatus;
    }

    private async fetchCarStatus(): Promise<ChargingStatus> {
        const path = `vehicle/v1/vehicles/${this.vehicleId}/selectivestatus`;
        const url = new URL(this.url + path)
        url.searchParams.set("jobs", "charging,chargingTimers,chargingProfiles,departureTimers,measurements,measurements,oilLevel,vehicleHealthInspection,access,vehicleLights,vehicleHealthWarnings");

        if (this.accessToken === undefined) {
            this.accessToken = await this.refreshAccessToken();
        }
        const data = new URLSearchParams();
        data.append('client_id', this.clientId);

        const executeFetchCarStatus = async () => {
            const headers = {
                "accept": "application/json",
                "Accept-encoding": "gzip",
                "accept-charset": "utf-8",
                "authorization": `Bearer ${this.accessToken}`, 
                "user-agent": this.userAgent, 
            };

            return await fetch(url, { method: "get", headers }) ;
        }

        let response = await executeFetchCarStatus();

        if (response.status === 401 || response.status === 403) {
            this.accessToken = await this.refreshAccessToken();
            response = await executeFetchCarStatus();
        }
        if (response.ok) {
            const json = await response.json();
            return { 
                batteryStatus: json.charging.batteryStatus.value,
                plugStatus: json.charging.plugStatus.value,
                measurements: {
                    electricRange: json.measurements.rangeStatus.value.electricRange,
                    gasolineRange: json.measurements.rangeStatus.value.gasolineRange,
                    currentFuelLevel_pct: json.measurements.fuelLevelStatus.value.currentFuelLevel_pct,
                    currentSOC_pct: json.measurements.fuelLevelStatus.value.currentSOC_pct,
                    odometer: json.measurements.odometerStatus.value.odometer,
                } 
            };   
        } else {
            const errorMessage = await response.text();
            throw new UserError(`fetchCarStatus failed ${errorMessage}`)
        }

    }

    private async schedulePlan(duration: number, finishAt: Date): Promise<void>  {
        const path = `power-consumer/${this.audiChagerId}/consumption-plan?consumptionDuration=${duration*60*1000}&finishAt=${finishAt.getTime()}`;
        const response = await fetch(this.smartEnergyUrl+path, { method: "post", headers: { 'Accept': 'application/json' } }) ;
        if (response.ok) {
            const powerConsumerModel = await response.json()
            const consumptionPlan = powerConsumerModel.consumptionPlan;
            this.ownConsumptionPlanId = consumptionPlan?.id;
        } else {
            console.log(`Consumption plan schedule attempt: ${response.statusText} ${await response.text()}`)
        }
    }

    private async createConsumptionPlan(chargingStatus: ChargingStatus): Promise<void> {
        const duration = (this.allowedBatteryChargingLevel - chargingStatus?.batteryStatus.currentSOC_pct) * 1.15;
        const now = new Date();
        const finishTomorrowMorning = new Date(DateTimeUtils.addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7).getTime() , 1));
        let finishAt = finishTomorrowMorning;
        if ((now.getDay() === 0 || now.getDay() === 6)  &&  7 < now.getHours() && now.getHours() < 18) {
            finishAt = new Date (now.getTime() + 2 * 60 * 60 * 1000);
        } else if (now.getHours() < 14 ){
            finishAt = new Date (now.getFullYear(), now.getMonth(), now.getDate(), 23);
        }

        await this.schedulePlan(duration, finishAt)
    }

    private async cancelConsumptionPlan(): Promise<void> {
        const path = `power-consumer/${this.audiChagerId}/consumption-plan`;
        let response = await fetch(this.smartEnergyUrl+path, { method: "delete", headers: { 'Accept': 'application/json' } });
        const json = await response.json();
    }

    protected async setConsumptionPlan(consumptionPlan: ConsumptionPlan): Promise<void> {
        this.consumptionPlan = consumptionPlan;
    }

    private cleanOldChargingStatus(): void {
        if (this.chargingStatus) {
            const refreshedAt = new Date(this.chargingStatus.batteryStatus.carCapturedTimestamp);
            if ((refreshedAt.getTime() - Date.now()) > 3 * 60 * 60 * 1000) {
                this.chargingStatus = null;
            }
        }
    }

    private executionShouldBeSkippedDueTimeOfDay(): boolean {
        const now = new Date();
        return now.getDay() > 0 && now.getDay() < 6 && now.getHours() > 7 && now.getHours() < 15;
    }

    private executionShouldBeSkippedDueToExecutedPlan(): boolean {
        const now = new Date();

        const processingConsumptionPan = this.consumptionPlan != null && this.consumptionPlan.state !== "processing";
        const powerIsProvided = this.chargingStatus?.plugStatus.externalPower === "ready";
        return processingConsumptionPan && !powerIsProvided && (now.getHours() > 22 || now.getHours() < 7)
    }

    private executionShouldBeSkippedDueToForthcomingCharging(): boolean {
        if (this.consumptionPlan && this.consumptionPlan.state === "processing") {
            return this.consumptionPlan.consumptionPlanItems[0].switchActions[0].at >= Date.now();
        }
        return false;
    }

    private storeAudiMeasurements() {
        const audiTracesDir = './audi-traces';

        if (!fs.existsSync(audiTracesDir)){
            fs.mkdirSync(audiTracesDir);
        }
        const fileName = `${audiTracesDir}/${new Date().getFullYear()}.csv`;
        const m = this.chargingStatus?.measurements;
        const lineDate = DateTimeUtils.formatDateTime(Date.now());
        const line = `\n${lineDate};${m?.currentFuelLevel_pct};${m?.gasolineRange};${m?.currentSOC_pct};${m?.electricRange};${m?.odometer};`;
        fs.appendFile(fileName, line, err => {
            if (err) {
                console.error(err);
            }
        });

    }

    protected async doExecute(): Promise<ExeutionResult> {
        let interval = undefined;

        const now = new Date();
        if (this.chargingStatus && now.getDay() !== this.currentDay ) {
            this.storeAudiMeasurements();
            this.currentDay = now.getDay();
        }

        if (this.executionShouldBeSkippedDueTimeOfDay()) {
            return null;
        }

        if (this.executionShouldBeSkippedDueToForthcomingCharging()) {
            return null;
        }

        if (this.executionShouldBeSkippedDueToExecutedPlan()) {
            return null;
        }
        
        try {
            let actionMessage = "OK";

            const newChargingStatus = await this.fetchCarStatus()
            console.log("Fetched charging status:", newChargingStatus);

            this.cleanOldChargingStatus();

            if((!this.chargingStatus || this.chargingStatus && this.chargingStatus.plugStatus.plugConnectionState === "disconnected") && newChargingStatus.plugStatus.plugConnectionState === "connected") {
                if (newChargingStatus.batteryStatus.currentSOC_pct < (this.allowedBatteryChargingLevel - 10)) {
                    if (!(this.consumptionPlan && this.consumptionPlan.state == "processing")) {
                        actionMessage = "Create consumption plan on charger connection";
                        this.createConsumptionPlan(newChargingStatus);
                    }
                }
            }

            if(this.consumptionPlan && this.consumptionPlan.id === this.ownConsumptionPlanId && this.consumptionPlan.state === "processing" 
                && newChargingStatus.plugStatus.plugConnectionState === "disconnected") {
                 actionMessage = "Cancel consumption plan on charger disconnection";
                 this.cancelConsumptionPlan();
            }

            this.chargingStatus = newChargingStatus;

            if (this.chargingStatus.plugStatus.ledColor === "green") {
                if (newChargingStatus.batteryStatus.currentSOC_pct >= (this.allowedBatteryChargingLevel)) {
                    actionMessage += " Disconnect charger !!!";
                    await this.cancelConsumptionPlan();
                } else {
                    if (newChargingStatus.batteryStatus.currentSOC_pct >= this.allowedBatteryChargingLevel * 0.7) {
                        interval = 6 * 60 * 1000; 
                    }
                    if (newChargingStatus.batteryStatus.currentSOC_pct >= this.allowedBatteryChargingLevel * 0.8) {
                        interval = 4 * 60 * 1000; 
                    }
                    if (newChargingStatus.batteryStatus.currentSOC_pct >= this.allowedBatteryChargingLevel * 0.9) {
                        interval = 2 * 60 * 1000; 
                    }
                }
            }

            
            return { logEntry: `${DateTimeUtils.formatDateTime(Date.now())}: ${actionMessage}`, interval};
        }catch(error) {
            return { logEntry: `${DateTimeUtils.formatDateTime(Date.now())}: ${error.message}`,  interval};
        }

    }

}
