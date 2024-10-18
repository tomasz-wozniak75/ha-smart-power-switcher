import { UserError } from "../../services/UserError";
import { JobService } from "./JobService";
import { DateTimeUtils } from "smart-power-consumer-api";


export class AudiService extends JobService {

    protected static accessToken?: string; 
    protected refreshToken: string; 
    protected vehicleId: string; 
    protected clientId: string; 
    protected userAgent: string; 
    protected url = `https://emea.bff.cariad.digital/`;

    public constructor(id: string, interval: number) {
        super(id, interval)
        this.vehicleId = process.env.vehicleId;
        this.clientId = process.env.clientId;
        this.userAgent = process.env.userAgent;
        this.refreshToken = process.env.refreshToken;
    }

    protected async refreshAccessToken(): Promise<string> {
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
        } else {
            throw new UserError(`refreshAccessToken failed ${response.statusText}`);
        }
    }

    protected dateToModifiedSince = (date: number) => {
        const gmtDate = new Date(date - 2 * 60 * 60 * 1000);
        const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const timeComponent = DateTimeUtils.formatTimeWithSecs(gmtDate.getTime());
        return `${dayNames[gmtDate.getDay()]}, ${gmtDate.getDate()} ${monthNames[gmtDate.getMonth()]} ${gmtDate.getFullYear()} ${timeComponent} GMT`
    }

}