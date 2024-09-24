

export class ConsumptionPlan {
}

export class PowerConsumer {
    private haDeviceName: string;
    private currentConsumptionPlan: ConsumptionPlan | null = null;

    constructor(haDeviceName: string) {
        this.haDeviceName = haDeviceName;
    }

    public scheduleConsumptionPlan(consumptionDuration: number, finishAt: number): Promise<ConsumptionPlan> {


        return Promise.resolve(this.currentConsumptionPlan);
    }

}