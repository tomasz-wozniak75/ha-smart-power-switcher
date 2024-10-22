import schedule from "node-schedule";

export interface JobState {
    id: string;
    interval: number;
    started: boolean;
    lastExecutionTime?: number;
    logEntries: string[];
}

export interface ExeutionResult {
    logEntry: string;
    inerval?: number;
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
        await this.execute();
        return this.jobState;
    }

    public async stop(): Promise<JobState> {
        this.jobState.started = false;

        return this.jobState;
    }

    protected  async execute(): Promise<void> {
        if (this.jobState.started) {
            this.jobState.lastExecutionTime = Date.now();
            const result = await this.doExecute();
            if (result) {
                this.jobState.logEntries.push(result.logEntry);
                if (this.jobState.logEntries.length > 20) {
                    this.jobState.logEntries.shift();
                }
            }
            this.scheduleExecution(result ? result.inerval : undefined);
        }
    }

    protected  abstract doExecute(): Promise<ExeutionResult>;

    private scheduleExecution(temporaryInterval?: number) {
        let interval = temporaryInterval ? temporaryInterval : this.jobState.interval;
        if (interval > 5 * 60 * 1000) {
            interval -= Math.random() * 2 * 60 * 1000;
        }
        schedule.scheduleJob(Date.now() + interval, async function(jobSerwice: JobService){
            jobSerwice.execute();
        }.bind(null, this));
    }

}