import { BaseCtrl } from "@/controlers/BaseCtrl";
import { Express } from "express";
import { ChargingTrackerService } from "../services/ChargingTrackerService";


export class ChargingTrackerControler extends BaseCtrl {
 
    private chargingTrackerService: ChargingTrackerService;

    public constructor(chargingTrackerService: ChargingTrackerService) {
        super();
        this.chargingTrackerService = chargingTrackerService;
    }

    public createRoutes(webServer: Express) {
        webServer.get(/^\/audi-tracker\/api\/charging\/?$/, async (req, res)=>{
            await this.getChargingStatus(req, res);
        });

        webServer.post(/^\/audi-tracker\/api\/charging\/consumption-plan\/?$/, async (req, res)=>{
            await this.setConsumptionPlan(req, res);
        });
    }
    
    public async getChargingStatus(req, res): Promise<void> {
        const chargingStatus = this.chargingTrackerService.getChargingStatus();
        if (chargingStatus) {
            res.status(200);
            res.json(chargingStatus);
        } else {
            res.sendStatus(204);
        }
    }

    public async setConsumptionPlan(req, res): Promise<void> {
        this.chargingTrackerService.setConsumptionPlan(req.body);
        res.sendStatus(200);
    }
}