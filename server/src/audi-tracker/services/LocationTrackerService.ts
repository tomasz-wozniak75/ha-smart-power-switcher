import { DateTimeUtils } from "smart-power-consumer-api";
import { UserError } from "../../services/UserError";
import { JobService } from "./JobService";
import fs from 'node:fs';
import { GpxFormat } from "./GpxFormat";


export interface AudiLocation {
  lon: number,
  lat: number,
  carCapturedTimestamp: string //"2024-10-17T17:42:15Z",
  lastRefresh?: number
}

export class LocationTrackerService extends JobService {

    private accessToken?: string; 
    private refreshToken: string; 
    private vehicleId: string; 
    private clientId: string; 
    private userAgent: string; 
    private url = `https://emea.bff.cariad.digital/`
    private locations: AudiLocation[] = [];
    private currentDay?: number;
    private lastRefresh: number;

    public constructor(interval: number = 15 * 60 * 1000) {
        super("location-tracker", interval);
        this.vehicleId = process.env.vehicleId;
        this.clientId = process.env.clientId;
        this.userAgent = process.env.userAgent;
        this.refreshToken = process.env.refreshToken;
        this.lastRefresh = Date.now() - 60*60*1000;
    }


    private async refreshAccessToken(): Promise<string> {
        const path = `login/v1/idk/token`;
        const headers = {
                "accept": "application/json",
                "Accept-encoding": "gzip",
                "accept-charset": "utf-8",
                "content-type": "application/x-www-form-urlencoded",
                "user-agent": this.userAgent, 
            };
        
        const data = new URLSearchParams();
        data.append('client_id', this.clientId);
        data.append('grant_type', 'refresh_token');
        data.append('response_type', 'token id_token');
        data.append('refresh_token', this.refreshToken);

        const response = await fetch(this.url+path, { method: "post", headers, body: data }) ;
        if (response.ok) {
            const json = await response.json()
            return json.access_token;
        }
        throw new UserError(response.statusText);
    }

    private dateToModifiedSince = (date: number) => {
        const gmtDate = new Date(date - 2 * 60 * 60 * 1000);
        const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const timeComponent = DateTimeUtils.formatTimeWithSecs(gmtDate.getTime());
        return `${dayNames[gmtDate.getDay()]}, ${gmtDate.getDate()} ${monthNames[gmtDate.getMonth()]} ${gmtDate.getFullYear()} ${timeComponent} GMT`
    }

    private async fetchParkingPosition(lastRefresh: number): Promise<AudiLocation> {
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

        if (response.status === 403) {
            this.accessToken = await this.refreshAccessToken();
            response = await executeFetchParkingPosition();
        }

        if (response.ok) {
            const json = await response.json();
            return json.data;    
        } else {
            throw new UserError(await response.text())
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

            if (this.isNewLocation(newLocation)) {
                this.locations.push(newLocation);
            }else {
                this.getLastLocation().lastRefresh = timeBeforeCall;
            }

            this.writeLocations();
            
            return `${new Date()}: OK`;
        }catch(error) {
            return `${new Date()}: ${error.message}`;
        }
    
    }

}