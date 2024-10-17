import { JobService } from "./JobService";


export class LocationTrackerService extends JobService {

    public constructor(interval: number) {
        super("location-tracker", interval);
    }

    protected async doExecute(): Promise<string> {

        return "OK"
    }
    
}