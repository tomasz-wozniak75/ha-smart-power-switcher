import { NotFoundError } from "./NotFoundError";
import { PowerConsumer, PowerConsumerModel } from "./PowerConsumer";
import { TimePeriodPricelistService } from "./TimePeriodPricelistService";

export class PowerConsumersService {

    private timePeriodPricelistService: TimePeriodPricelistService; 

    private powerConsumers: { [consumerId: string]: PowerConsumer; } = {};

    constructor(timePeriodPricelist: TimePeriodPricelistService) {
        this.timePeriodPricelistService = timePeriodPricelist;

        this.powerConsumers["audi-charger"] = new PowerConsumer("audi-charger", "Audi charger", this.timePeriodPricelistService);
    }

    private getPowerConsumer(powerConsumerId: string): PowerConsumer {
        if (this.powerConsumers[powerConsumerId] === undefined) {
            throw new NotFoundError(`${powerConsumerId} not found`);
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