import { UserError } from "../../services/UserError";
import { AudiService } from "./AudiService";
import { ExeutionResult } from "./JobService";

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

export interface ChargingStatus {
    batteryStatus: BatteryStatus,
    plugStatus: PlugStatus
}

export class ChargingTrackerService extends AudiService {

    private chargingStatus: ChargingStatus | null;
    private allowedBatteryChargingLevel: number = 80;

    public constructor(interval: number = 15 * 60 * 1000) {
        super("charging-tracker", interval);
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

        console.log(`First fetch car status ${response.status} : typeof ${typeof response.status}`)

        if (response.status === 401 || response.status === 403) {
            console.log(`refreshing token ${this.accessToken}`)
            this.accessToken = await this.refreshAccessToken();
            console.log(`fresh token ${this.accessToken}`)
            response = await executeFetchCarStatus();
        }
        if (response.ok) {
            const json = await response.json();
            return { batteryStatus: json.charging.batteryStatus.value, plugStatus: json.charging.plugStatus.value };   
        } else {
            const errorMessage = await response.text();
            throw new UserError(`fetchCarStatus failed ${errorMessage}`)
        }

    }


    protected async doExecute(): Promise<ExeutionResult> {
        let interval = undefined;
        
        try {
            let actionMessage = "OK";

            const newChargingStatus = await this.fetchCarStatus()
            console.log("Fetched charging status:", newChargingStatus);

            if(!this.chargingStatus || this.chargingStatus.plugStatus.plugConnectionState === "disconnected" && newChargingStatus.plugStatus.plugConnectionState === "connected") {
                if (newChargingStatus.batteryStatus.currentSOC_pct < this.allowedBatteryChargingLevel) {
                    actionMessage = "Create consumption plan on charger connection";
                    console.log("plan charging")
                }
            }

            this.chargingStatus = newChargingStatus;

            if (this.chargingStatus.plugStatus.ledColor === "green") {
                if (newChargingStatus.batteryStatus.currentSOC_pct >= this.allowedBatteryChargingLevel) {
                    actionMessage = "Disconnect charger";
                    console.log("do disconnect !!!")
                } else {
                    if (newChargingStatus.batteryStatus.currentSOC_pct >= this.allowedBatteryChargingLevel * 0.8) {
                        interval = 3 * 60 * 1000; 
                    }
                }
            }

            
            return { logEntry: `${new Date().toISOString()}: ${actionMessage}`, interval};
        }catch(error) {
            return { logEntry: `${new Date().toISOString()}: ${error.message}`,  interval};
        }

    }
}