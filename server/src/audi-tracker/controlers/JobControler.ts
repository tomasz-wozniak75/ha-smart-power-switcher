
import { BaseCtrl } from "@/controlers/BaseCtrl";
import { Express } from "express";
import { JobService } from "../services/JobService";
import { LocationTrackerService } from "../services/LocationTrackerService";
import { NotFoundError } from "@/services/NotFoundError";


export class JobControler extends BaseCtrl {
 
    private jobs: JobService[];

    public constructor() {
        super();
        this.jobs = [new LocationTrackerService(1*60*1000)];
    }

    public createRoutes(webServer: Express) {
        webServer.get(/^\/audi-tracker\/api\/jobs\/?$/, async (req, res)=>{
            await this.getJobsList(req, res);
        });

        webServer.get(/^\/audi-tracker\/api\/jobs\/.*\/?$/, async (req, res)=>{
            await this.getJob(req, res);
        });

        webServer.post(/^\/audi-tracker\/api\/jobs\/.*\/start$/, async (req, res)=>{
            await this.start(req, res);
        });

        webServer.post(/^\/audi-tracker\/api\/jobs\/.*\/stop$/, async (req, res)=>{
            await this.stop(req, res);
        });
    }
    
    public async getJobsList(req, res): Promise<void> {
        res.status(200);
        res.json(this.jobs.map(job => job.getState()))
    }

    private findJob(req, res): JobService | null {
        const id = "location-tracker"; //todo
        const job = this.jobs.find(job => job.getState().id === id);
        console.log("Job: ", job.getState());
        if (job === null) {
            throw new NotFoundError(`Job not found ${id}`);
        }
        return job;
    }

    public async getJob(req, res): Promise<void> {
        try{
            const job = this.findJob(req, res);
            res.status(200);
            res.json(job.getState());
        }catch (error) {
            this.handleErrors(error, res);
        }
    }

    public async start(req, res): Promise<void> {
        try{
            const job = this.findJob(req, res);
            const jobConfig = await job.start();
            res.status(200)
            res.json(jobConfig);
        }catch (error) {
            this.handleErrors(error, res);
        }
    }

    public async stop(req, res): Promise<void> {
        try{
            const job = this.findJob(req, res);
            const jobConfig = await job.stop();
            res.status(200)
            res.json(jobConfig);
        }catch (error) {
            this.handleErrors(error, res);
        }
    }

}