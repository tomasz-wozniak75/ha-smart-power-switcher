import { PowerConsumerModel } from "smart-power-consumer-api";
import { NotFoundError } from "./NotFoundError";
import { PowerConsumer } from "./PowerConsumer";
import { TimePeriodPricelistService } from "./TimePeriodPricelistService";
import { HomeAsistantService } from "./HomeAsistantService";

export class PowerConsumersService {

    private timePeriodPricelistService: TimePeriodPricelistService; 

    private powerConsumers: { [consumerId: string]: PowerConsumer; } = {};

    constructor(timePeriodPricelist: TimePeriodPricelistService) {
        this.timePeriodPricelistService = timePeriodPricelist;

        const homeAsistantService = new HomeAsistantService(process.env.HA_TOKEN || null, process.env.HA_URL || null);

        const audiChagerId = "switch.audi_charger_breaker_switch";
        this.powerConsumers[audiChagerId] = new PowerConsumer(
            audiChagerId, "Audi charger", this.timePeriodPricelistService, homeAsistantService, process.env.audiTtrackerConsumptionPlanUrl, process.env.chargingStatusUrl
        );


        const onePhaseSwitchId = "switch.smart_plug_socket_1";
        this.powerConsumers[onePhaseSwitchId] = new PowerConsumer(onePhaseSwitchId, "One phase switch", this.timePeriodPricelistService, homeAsistantService);
    }

    public getPowerConsumer(powerConsumerId: string): PowerConsumer {
        if (this.powerConsumers[powerConsumerId] === undefined) {
            throw new NotFoundError(`Power consumer ${powerConsumerId} not found`);
        }

        return this.powerConsumers[powerConsumerId];
    }

    public getPowerConsumeModels(): PowerConsumerModel[] {
        return Object.values(this.powerConsumers).map(powerConsumer => powerConsumer.getPowerConsumerModel());
    }

    public async scheduleConsumptionPlan(powerConsumerId: string, consumptionDuration: number, finishAt: number): Promise<PowerConsumerModel> {
        return this.getPowerConsumer(powerConsumerId).scheduleConsumptionPlan(consumptionDuration, finishAt);
    }

    public async deleteConsumptionPlan(powerConsumerId: string): Promise<PowerConsumerModel> {
        return this.getPowerConsumer(powerConsumerId).deleteConsumptionPlan();
    }
    
}