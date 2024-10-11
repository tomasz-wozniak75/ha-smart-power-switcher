import { Express } from "express";
import { PowerConsumersService } from "@/services/PowerConsumersService";
import { BaseCtrl } from "./BaseCtrl";

export class PowerConsumersCtrl  extends BaseCtrl {
    private powerConsumersService: PowerConsumersService;

    public constructor(powerConsumersService: PowerConsumersService) {
        super();
        this.powerConsumersService = powerConsumersService;
    } 

    public createRoutes(webServer: Express) {
        webServer.get(/^\/power-consumer\/?$/, async (req, res)=>{
            await this.getPowerConsumers(req, res);
        });

        webServer.post(/^\/power-consumer\/.*\/consumption-plan\/?/, async (req, res)=>{
            await this.scheduleConsumptionPlan(req, res);
        });

        webServer.delete(/^\/power-consumer\/.*\/consumption-plan\/?/, async (req, res)=>{
            await this.deleteConsumptionPlan(req, res);
        });

    }

    private async getPowerConsumers(req, res): Promise<void> {
        const powerConsumeModels = await this.powerConsumersService.getPowerConsumeModels()
        res.status(200);
        res.json(powerConsumeModels)
    }

    private async scheduleConsumptionPlan(req, res): Promise<void> {
        try{
            const powerConsumerId = /^\/power-consumer\/(.*)\/consumption-plan\/?/.exec(req.path)[1];
            const consumptionDuration = this.getRequestNumericParam(req.query, "consumptionDuration") as number;
            const finishAt = this.getRequestNumericParam(req.query, "finishAt") as number;
            const powerConsumeModel = await this.powerConsumersService.scheduleConsumptionPlan(powerConsumerId, consumptionDuration, finishAt)
            res.status(200);
            res.json(powerConsumeModel)
        }catch (error) {
            this.handleErrors(error, res);
        }
    }

    private async deleteConsumptionPlan(req: any, res: any) {
         try{
            const powerConsumerId = /^\/power-consumer\/(.*)\/consumption-plan\/?/.exec(req.path)[1];
            const powerConsumeModel = await this.powerConsumersService.deleteConsumptionPlan(powerConsumerId);
            res.status(200);
            res.json(powerConsumeModel)
        }catch (error) {
            this.handleErrors(error, res);
        }
    }
}