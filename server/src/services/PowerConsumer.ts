import { PricelistItem } from "./PricelistItem";
import { TimePeriodPricelistService } from "./TimePeriodPricelistService";


class SwitchAction {
    at: number;
    switchOn: boolean;
    constructor(at: number, switchOn: boolean) {
        this.at = at;
        this.switchOn = switchOn;
    } 
}

export class ConsumptionPlanItem {
    pricelistItem: PricelistItem;
    duration: number;
    switchActions: SwitchAction[] = [];

    constructor(pricelistItem: PricelistItem, duration: number) {
        this.pricelistItem = pricelistItem;
        this.duration = duration;
    }
}

export class ConsumptionPlan {
    consumptionPlanItems: ConsumptionPlanItem[];
    state: string = "processing";

    constructor(consumptionPlanItems: ConsumptionPlanItem[]) {
        this.consumptionPlanItems = consumptionPlanItems;
    }
}

export class PowerConsumer {
    private haDeviceName: string;
    private consumptionPlan: ConsumptionPlan | null = null;

    private timePeriodPricelistService: TimePeriodPricelistService; 

    constructor(haDeviceName: string, timePeriodPricelist: TimePeriodPricelistService) {
        this.haDeviceName = haDeviceName;
        this.timePeriodPricelistService = timePeriodPricelist;

    }

    sortConsumptionPlanByTime(consumptionPlan: ConsumptionPlanItem[]): ConsumptionPlanItem[]  {
        return [...consumptionPlan].sort((a, b) => a.pricelistItem.startsAt - b.pricelistItem.startsAt);
    }

    sortPricelistByPrice(pricelist: PricelistItem[]): PricelistItem[]  {
        return [...pricelist].sort((a, b) => {
                    if (a.price < b.price) return -1;
                    if (a.price > b.price) return 1;
                    if (a.startsAt < b.startsAt) return -1;
                    if (a.startsAt > b.startsAt) return 1;
                    return 0;
        });        
    }

    public async selectPriceListItemsForConsumptionPlan(consumptionDuration: number, startFrom: number, finishAt: number): Promise<ConsumptionPlanItem[]> {
        const pricelist = await this.timePeriodPricelistService.getPriceList(startFrom, finishAt);
        const pricelistByPrice = this.sortPricelistByPrice(pricelist);
        let currentConsumptionDuration = 0;
        const consumptionPlan: ConsumptionPlanItem[] = [];
        for(let pricelistItem of pricelistByPrice) {
            if (currentConsumptionDuration+pricelistItem.duration<=consumptionDuration) {
                currentConsumptionDuration+=pricelistItem.duration;
                consumptionPlan.push(new ConsumptionPlanItem(pricelistItem, pricelistItem.duration));
            }else {
                const delta = consumptionDuration - currentConsumptionDuration;
                if (delta > 0){
                    consumptionPlan.push(new ConsumptionPlanItem(pricelistItem, delta));
                }
                break;
            }
        }
        const sortedConsumptionPlan = this.sortConsumptionPlanByTime(consumptionPlan);
        return sortedConsumptionPlan;
    }

    public async createConsumptionPlan(consumptionDuration: number, startFrom: number,  finishAt: number): Promise<ConsumptionPlanItem[]> {
        const sortedConsumptionPlan = await this.selectPriceListItemsForConsumptionPlan(consumptionDuration, startFrom, finishAt);
        let prevConsumptionPlanItem: ConsumptionPlanItem | null = null;
        let prevItemIsAdjecent = false;
        for(let consumptionItem of sortedConsumptionPlan) {
            const pricelistItem = consumptionItem.pricelistItem;

            if (prevItemIsAdjecent && prevConsumptionPlanItem != null) {
                const prevPricelistItem = prevConsumptionPlanItem.pricelistItem;
                if ((prevPricelistItem.startsAt + prevPricelistItem.duration) < pricelistItem.startsAt) {
                    prevItemIsAdjecent = false;
                    prevConsumptionPlanItem.switchActions.push(new SwitchAction(prevPricelistItem.startsAt + prevPricelistItem.duration, false));
                }
            }
            prevConsumptionPlanItem = consumptionItem;

            if(consumptionItem.duration < pricelistItem.duration) {
               if (prevItemIsAdjecent) {
                consumptionItem.switchActions.push(new SwitchAction(pricelistItem.startsAt+consumptionItem.duration, false))
                prevItemIsAdjecent = false;
               } else {
                consumptionItem.switchActions.push(new SwitchAction(pricelistItem.startsAt+(pricelistItem.duration - consumptionItem.duration), true))
                prevItemIsAdjecent = true;
               }    
            } else {
             if (!prevItemIsAdjecent) {
                consumptionItem.switchActions.push(new SwitchAction(pricelistItem.startsAt, true))
                prevItemIsAdjecent = true;
               } 
            }
        }

        const lastConsumptionPlanItem = sortedConsumptionPlan[sortedConsumptionPlan.length-1];
        const lastSwitchActions = lastConsumptionPlanItem.switchActions;
        if (lastSwitchActions.length == 0 || lastSwitchActions[lastSwitchActions.length-1].switchOn ) {
            lastSwitchActions.push(new SwitchAction(lastConsumptionPlanItem.pricelistItem.startsAt+lastConsumptionPlanItem.pricelistItem.duration, false));
        }

        return sortedConsumptionPlan;

    }


    public async scheduleConsumptionPlan(consumptionDuration: number, finishAt: number): Promise<ConsumptionPlan> {
        if (this.consumptionPlan != null && this.consumptionPlan.state == "processing") {
            throw new Error("Current plan needs to be canceled!");
        }
        this.consumptionPlan = new ConsumptionPlan(await this.createConsumptionPlan(consumptionDuration, Date.now(), finishAt));

        return this.consumptionPlan;
    }

}