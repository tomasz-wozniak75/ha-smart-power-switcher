import { PricelistItem, ConsumptionPlanItem, ConsumptionPlan, PowerConsumerModel, DateTimeUtils } from "smart-power-consumer-api";
import { TimePeriodPricelistService } from "./TimePeriodPricelistService";


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
                    prevConsumptionPlanItem.switchActions.push({ at: prevPricelistItem.startsAt + prevPricelistItem.duration, switchOn: false});
                }
            }
            prevConsumptionPlanItem = consumptionItem;

            if(consumptionItem.duration < pricelistItem.duration) {
               if (prevItemIsAdjecent) {
                consumptionItem.switchActions.push({ at: pricelistItem.startsAt+consumptionItem.duration, switchOn: false});
                prevItemIsAdjecent = false;
               } else {
                consumptionItem.switchActions.push({ at: pricelistItem.startsAt+(pricelistItem.duration - consumptionItem.duration), switchOn: true});
                prevItemIsAdjecent = true;
               }    
            } else {
             if (!prevItemIsAdjecent) {
                consumptionItem.switchActions.push({ at: pricelistItem.startsAt, switchOn: true});
                prevItemIsAdjecent = true;
               } 
            }
        }

        const lastConsumptionPlanItem = sortedConsumptionPlan[sortedConsumptionPlan.length-1];
        const lastSwitchActions = lastConsumptionPlanItem.switchActions;
        if (lastSwitchActions.length == 0 || lastSwitchActions[lastSwitchActions.length-1].switchOn ) {
            lastSwitchActions.push({ at: lastConsumptionPlanItem.pricelistItem.startsAt+lastConsumptionPlanItem.pricelistItem.duration, switchOn: false});
        }

        return sortedConsumptionPlan;
    }


    public async scheduleConsumptionPlan(consumptionDuration: number, finishAt: number): Promise<PowerConsumerModel> {
        if (this.consumptionPlan != null && this.consumptionPlan.state == "processing") {
            throw new Error("Current plan needs to be canceled!");
        }
        this.consumptionPlan = { consumptionDuration, finishAt, consumptionPlanItems: await this.createConsumptionPlan(consumptionDuration, Date.now(), finishAt), state: "processing" };

        return this.getPowerConsumerModel();
    }

    public getPowerConsumerModel(): PowerConsumerModel {
        const now = new Date();
        const defaultFinishAt = now.getHours() < 16 ? now.getTime() + 2 * 3600 * 1000 : DateTimeUtils.addDays(new Date(now.getFullYear(), now.getDate(), 7).getTime() , 1);
        return { id: this.haDeviceName, name: this.name, defaultConsumptionDuration: 90, defaultFinishAt,   consumptionPlan: this.consumptionPlan };
    }

    public deleteConsumptionPlan(): PowerConsumerModel | PromiseLike<PowerConsumerModel> {
        if (this.consumptionPlan) {
            this.consumptionPlan.state = "canceled"
            this.consumptionPlan = null;
        }

        return this.getPowerConsumerModel();
    }

}