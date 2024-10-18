import { UserError } from "@/services/UserError";
import { AudiService } from "./AudiService";
import { ExeutionResult } from "./JobService";

export class ChargingTrackerService extends AudiService {

    public constructor(interval: number = 15 * 60 * 1000) {
        super("charging-tracker", interval);
    }

    private async fetchCarStatus(lastRefresh: number): Promise<Object> {
        const path = `vehicle/v1/vehicles/${this.vehicleId}/parkingposition`;

        if (this.accessToken === undefined) {
            this.accessToken = await this.refreshAccessToken();
        }

        const executeFetchCarStatus = async () => {
            const headers = {
                "accept": "application/json",
                "Accept-encoding": "gzip",
                "accept-charset": "utf-8",
                "authorization": `Bearer ${this.accessToken}`, 
                "user-agent": this.userAgent, 
                "if-modified-since": this.dateToModifiedSince(lastRefresh),
            };
            return await fetch(this.url+path, { method: "get", headers }) ;
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
            return json;    
        } else {
            const errorMessage = await response.text();
            throw new UserError(`fetchCarStatus failed ${errorMessage}`)
        }

    }


    protected async doExecute(): Promise<ExeutionResult> {

        let interval = undefined;
        try {
            console.log("Fetched car status:", newLocation);

            
            return { logEntry: `${new Date().toISOString()}: OK`, interval};
        }catch(error) {
            return { logEntry: `${new Date().toISOString()}: ${error.message}`,  interval};
        }

    }
}