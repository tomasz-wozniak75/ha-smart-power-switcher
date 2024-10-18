import { DateTimeUtils } from "smart-power-consumer-api";
import { UserError } from "../../services/UserError";
import fs from 'node:fs';
import { GpxFormat } from "./GpxFormat";
import { AudiService } from "./AudiService";


export interface AudiLocation {
  lon: number,
  lat: number,
  carCapturedTimestamp: string //"2024-10-17T17:42:15Z",
  lastRefresh?: number
}

export class LocationTrackerService extends AudiService {

    private locations: AudiLocation[] = [];
    private currentDay?: number;
    private lastRefresh: number;

    public constructor(interval: number = 15 * 60 * 1000) {
        super("location-tracker", interval);
        this.lastRefresh = Date.now() - 60*60*1000;
    }


    private async fetchParkingPosition(lastRefresh: number): Promise<AudiLocation | null> {
        const path = `vehicle/v1/vehicles/${this.vehicleId}/parkingposition`;

        if (this.accessToken === undefined) {
            this.accessToken = await this.refreshAccessToken();
        }

        const executeFetchParkingPosition = async () => {
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

        let response = await executeFetchParkingPosition();

        console.log(`First fetch parking position status ${response.status}`)

        if (response.status in [401, 403]) {
            console.log(`refreshing token ${this.accessToken}`)
            this.accessToken = await this.refreshAccessToken();
            console.log(`fresh token ${this.accessToken}`)
            response = await executeFetchParkingPosition();
        }

        if (response.status === 204) {
            return null;
        }

        if (response.ok) {
            const json = await response.json();
            return json.data;    
        } else {
            const errorMessage = await response.text();
            throw new UserError(`fetchParkingPosition failed ${errorMessage}`)
        }

    }

    private writeLocations() {
        var audiTracesDir = './audi-traces';

        if (!fs.existsSync(audiTracesDir)){
            fs.mkdirSync(audiTracesDir);
        }
        const gpxfileName = `${audiTracesDir}/${DateTimeUtils.formatDate(this.currentDay)}.gpx`;
        const gpxFile = GpxFormat.convert(this.currentDay, this.locations);
        fs.writeFile(gpxfileName, gpxFile, err => {
            if (err) {
                console.error(err);
            }
        });
    }

    private getLastLocation(): AudiLocation {
        return this.locations[this.locations.length-1];;
    }

    private isNewLocation(newLocation: AudiLocation): boolean {
        if (this.locations.length === 0) {
            return true;
        } 
        const lastLocation = this.getLastLocation();

        return lastLocation.lon !== newLocation.lon || lastLocation.lat !== newLocation.lat;
    }

    protected async doExecute(): Promise<string> {
       const today = DateTimeUtils.cutOffTime(Date.now());
       if( this.currentDay === undefined) {
           this.currentDay = today;
       }

       if( this.currentDay !== today) {
           this.writeLocations();
           this.locations = []; 
           this.currentDay = today;
       }

        try {
            const timeBeforeCall = Date.now();
            const newLocation = await this.fetchParkingPosition(this.lastRefresh);
            this.lastRefresh = timeBeforeCall;

            console.log("Fetched new location:", newLocation);

            if (newLocation != null && this.isNewLocation(newLocation)) {
                this.locations.push(newLocation);
            }else {
                const lastLocation = this.getLastLocation();
                if (lastLocation) {
                    this.getLastLocation().lastRefresh = timeBeforeCall;
                }
            }

            this.writeLocations();
            
            return `${new Date().toISOString()}: OK`;
        }catch(error) {
            return `${new Date().toISOString()}: ${error.message}`;
        }
    
    }

}
