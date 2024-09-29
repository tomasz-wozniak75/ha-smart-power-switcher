import { PricelistItem, ConsumptionPlanItem, ConsumptionPlan, PowerConsumerModel, DateTimeUtils, SwitchAction } from "smart-power-consumer-api";
import { TimePeriodPricelistService } from "./TimePeriodPricelistService";
import schedule from "node-schedule";


export class PowerConsumer {
    private haDeviceName: string;
    private name: string;
    private consumptionPlan: ConsumptionPlan | null = null;

    private timePeriodPricelistService: TimePeriodPricelistService; 

    constructor(haDeviceName: string, name: string, timePeriodPricelist: TimePeriodPricelistService) {
        this.haDeviceName = haDeviceName;
        this.name = name;
        this.timePeriodPricelistService = timePeriodPricelist;

    }

    private sortConsumptionPlanByTime(consumptionPlan: ConsumptionPlanItem[]): ConsumptionPlanItem[]  {
        return [...consumptionPlan].sort((a, b) => a.pricelistItem.startsAt - b.pricelistItem.startsAt);
    }

    private sortPricelistByPrice(pricelist: PricelistItem[]): PricelistItem[]  {
        return [...pricelist].sort((a, b) => {
                    if (a.price < b.price) return -1;
                    if (a.price > b.price) return 1;
                    if (a.startsAt < b.startsAt) return -1;
                    if (a.startsAt > b.startsAt) return 1;
                    return 0;
        });        
    }

    private async selectPriceListItemsForConsumptionPlan(consumptionDuration: number, startFrom: number, finishAt: number): Promise<ConsumptionPlanItem[]> {
        const pricelist = await this.timePeriodPricelistService.getPriceList(startFrom, finishAt);
        const pricelistByPrice = this.sortPricelistByPrice(pricelist);
        let currentConsumptionDuration = 0;
        const consumptionPlan: ConsumptionPlanItem[] = [];
        for(let pricelistItem of pricelistByPrice) {
            if (currentConsumptionDuration+pricelistItem.duration<=consumptionDuration) {
                currentConsumptionDuration+=pricelistItem.duration;
                consumptionPlan.push({pricelistItem, duration: pricelistItem.duration, switchActions: [] });
            }else {
                const delta = consumptionDuration - currentConsumptionDuration;
                if (delta > 0){
                    consumptionPlan.push({ pricelistItem, duration: delta, switchActions: [] });
                }
                break;
            }
        }
        const sortedConsumptionPlan = this.sortConsumptionPlanByTime(consumptionPlan);
        return sortedConsumptionPlan;
    }

    private newSwitchAction(at:  number, switchOn: boolean): SwitchAction {
        return {at, switchOn, state: "scheduled", result: null};
    }

    async createConsumptionPlan(consumptionDuration: number, startFrom: number,  finishAt: number): Promise<ConsumptionPlanItem[]> {
        const sortedConsumptionPlan = await this.selectPriceListItemsForConsumptionPlan(consumptionDuration, startFrom, finishAt);
        let prevConsumptionPlanItem: ConsumptionPlanItem | null = null;
        let prevItemIsAdjecent = false;
        for(let consumptionItem of sortedConsumptionPlan) {
            const pricelistItem = consumptionItem.pricelistItem;

            if (prevItemIsAdjecent && prevConsumptionPlanItem != null) {
                const prevPricelistItem = prevConsumptionPlanItem.pricelistItem;
                if ((prevPricelistItem.startsAt + prevPricelistItem.duration) < pricelistItem.startsAt) {
                    prevItemIsAdjecent = false;
                    prevConsumptionPlanItem.switchActions.push(this.newSwitchAction(prevPricelistItem.startsAt + prevPricelistItem.duration, false));
                }
            }
            prevConsumptionPlanItem = consumptionItem;

            if(consumptionItem.duration < pricelistItem.duration) {
               if (prevItemIsAdjecent) {
                consumptionItem.switchActions.push(this.newSwitchAction(pricelistItem.startsAt+consumptionItem.duration, false));
                prevItemIsAdjecent = false;
               } else {
                consumptionItem.switchActions.push(this.newSwitchAction(pricelistItem.startsAt+(pricelistItem.duration - consumptionItem.duration), true));
                prevItemIsAdjecent = true;
               }    
            } else {
             if (!prevItemIsAdjecent) {
                consumptionItem.switchActions.push(this.newSwitchAction(pricelistItem.startsAt, true));
                prevItemIsAdjecent = true;
               } 
            }
        }

        const lastConsumptionPlanItem = sortedConsumptionPlan[sortedConsumptionPlan.length-1];
        const lastSwitchActions = lastConsumptionPlanItem.switchActions;
        if (lastSwitchActions.length == 0 || lastSwitchActions[lastSwitchActions.length-1].switchOn ) {
            lastSwitchActions.push(this.newSwitchAction(lastConsumptionPlanItem.pricelistItem.startsAt+lastConsumptionPlanItem.pricelistItem.duration,  false));
        }

        return sortedConsumptionPlan;
    }


    scheduleSwitchActions(consumptionPlan: ConsumptionPlan) {
        consumptionPlan.consumptionPlanItems.flatMap((consumptionPlanItem) => consumptionPlanItem.switchActions).forEach((switchAction) => {
            
            schedule.scheduleJob(switchAction.at, function(switchAction: SwitchAction){
                if (switchAction.state == "scheduled") {
                    switchAction.state = "executed";
                    switchAction.result = "OK";
                    console.log('Switch action executed ', switchAction);
                }
            }.bind(null, switchAction));
        });
    }


    public async scheduleConsumptionPlan(consumptionDuration: number, finishAt: number): Promise<PowerConsumerModel> {
        if (this.consumptionPlan != null && this.consumptionPlan.state == "processing") {
            throw new Error("Current plan needs to be canceled!");
        }
        this.consumptionPlan = { createdAt: Date.now(), consumptionDuration, finishAt, consumptionPlanItems: await this.createConsumptionPlan(consumptionDuration, Date.now(), finishAt), state: "processing" };

        this.scheduleSwitchActions(this.consumptionPlan);

        return this.getPowerConsumerModel();
    }


    public getPowerConsumerModel(): PowerConsumerModel {
        const now = new Date();
        const defaultFinishAt = now.getHours() < 16 ? now.getTime() + 2 * 3600 * 1000 : DateTimeUtils.addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7).getTime() , 1);
        return { id: this.haDeviceName, name: this.name, defaultConsumptionDuration: 90, defaultFinishAt,   consumptionPlan: this.consumptionPlan };
    }

    public deleteConsumptionPlan(): PowerConsumerModel | PromiseLike<PowerConsumerModel> {
        if (this.consumptionPlan) {
            this.consumptionPlan.state = "canceled"
            this.consumptionPlan.consumptionPlanItems.flatMap((consumptionPlanItem) => consumptionPlanItem.switchActions).forEach((switchAction) => {
                if (switchAction.state != "executed") {
                    switchAction.state = "canceled";
                }
            });
            this.consumptionPlan = null;
        }

        return this.getPowerConsumerModel();
    }

}