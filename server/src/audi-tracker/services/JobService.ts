import schedule from "node-schedule";

export interface JobState {
    id: string;
    interval: number;
    started: boolean;
    lastExecutionTime?: number;
    logEntries: string[];
}

export abstract class JobService {
    protected jobState: JobState;

    public constructor(id: string, interval: number) {
        this.jobState = {id, interval, started: false, logEntries: [] };
    }

    public getState(): JobState {
        return this.jobState
    }

    public async start(): Promise<JobState> {
        this.jobState.started = true;
        this.scheduleExecution();
        return this.jobState;
    }

    public async stop(): Promise<JobState> {
        this.jobState.started = false;

        return this.jobState;
    }

    protected  async execute(): Promise<void> {
        if (this.jobState.started) {
            this.jobState.lastExecutionTime = Date.now();
            this.jobState.logEntries.push(await this.doExecute());
            this.scheduleExecution();
        }
    }

    protected  abstract doExecute(): Promise<string>;

    private scheduleExecution() {
        schedule.scheduleJob(Date.now() + this.jobState.interval, async function(jobSerwice: JobService){
            jobSerwice.execute();
        }.bind(null, this));
    }

}