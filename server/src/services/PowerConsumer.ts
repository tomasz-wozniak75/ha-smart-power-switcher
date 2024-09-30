import { PricelistItem, ConsumptionPlanItem, ConsumptionPlan, PowerConsumerModel, DateTimeUtils, SwitchAction } from "smart-power-consumer-api";
import { TimePeriodPricelistService } from "./TimePeriodPricelistService";
import schedule from "node-schedule";
import { UserError } from "./UserError";
import { HomeAsistantService } from "./HomeAsistantService";


export class PowerConsumer {
    private haDeviceName: string;
    private name: string;
    private consumptionPlan: ConsumptionPlan | null = null;

    private timePeriodPricelistService: TimePeriodPricelistService; 
    private homeAsistantService: HomeAsistantService;

    constructor(haDeviceName: string, name: string, timePeriodPricelist: TimePeriodPricelistService, homeAsistantService: HomeAsistantService) {
        this.haDeviceName = haDeviceName;
        this.name = name;
        this.timePeriodPricelistService = timePeriodPricelist;
        this.homeAsistantService = homeAsistantService;
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

    private removeElapsedtime(pricelistItem: PricelistItem, startFrom: number): number {
        if(pricelistItem.startsAt < startFrom && startFrom < (pricelistItem.startsAt + pricelistItem.duration)) {
            return pricelistItem.duration - (startFrom - pricelistItem.startsAt);            
        }
        return pricelistItem.duration;
    }

    private async selectPriceListItemsForConsumptionPlan(consumptionDuration: number, startFrom: number, finishAt: number): Promise<ConsumptionPlanItem[]> {
        const pricelist = await this.timePeriodPricelistService.getPriceList(startFrom, finishAt);
        const pricelistByPrice = this.sortPricelistByPrice(pricelist);
        let currentConsumptionDuration = 0;
        const consumptionPlan: ConsumptionPlanItem[] = [];
        for(let pricelistItem of pricelistByPrice) {
            const pricelistItemDuration = this.removeElapsedtime(pricelistItem, startFrom);
            if (currentConsumptionDuration+pricelistItemDuration<=consumptionDuration) {
                currentConsumptionDuration+=pricelistItemDuration;
                consumptionPlan.push({pricelistItem, duration: pricelistItemDuration, switchActions: [] });
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
        return {at, switchOn, state: "scheduled", result: undefined};
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
                const pricelistItemEnd = pricelistItem.startsAt + pricelistItem.duration;
                const forcedPricelistItemEnd = finishAt < pricelistItemEnd ? finishAt : pricelistItemEnd;
                consumptionItem.switchActions.push(this.newSwitchAction(forcedPricelistItemEnd - consumptionItem.duration, true));
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
            let itemStartFrom = lastConsumptionPlanItem.pricelistItem.startsAt;
            if (lastSwitchActions.length == 1) {
                itemStartFrom = lastSwitchActions[0].at;
            }
            lastSwitchActions.push(this.newSwitchAction(itemStartFrom+lastConsumptionPlanItem.duration,  false));
        }

        return sortedConsumptionPlan;
    }


    scheduleSwitchActions(consumptionPlan: ConsumptionPlan) {
        const homeAsistantService = this.homeAsistantService;
        const haDeviceName = this.haDeviceName;

        consumptionPlan.consumptionPlanItems.flatMap((consumptionPlanItem) => consumptionPlanItem.switchActions).forEach((switchAction) => {
            
            schedule.scheduleJob(switchAction.at, async function(switchAction: SwitchAction, consumptionPlan: ConsumptionPlan){
                if (switchAction.state == "scheduled") {
                    switchAction.state = "executed";
                    try{
                        await homeAsistantService.switchDevice(haDeviceName, switchAction.switchOn);
                        switchAction.result = "OK";
                        console.log(`Switch action executed at ${new Date().toISOString()}`, switchAction);
                    }catch(error) {
                        switchAction.result = error.message;
                        console.log(`Switch action executed at ${new Date().toISOString()}`, switchAction);
                    }
                }

                if(consumptionPlan.state == "processing") {
                    let hasScheduled = false;
                    for(let nextSwitchAction of consumptionPlan.consumptionPlanItems.flatMap((consumptionPlanItem) => consumptionPlanItem.switchActions)) {
                        if (nextSwitchAction.state == "scheduled") {
                            hasScheduled = true;
                            break;
                        }        
                    }
                    if (!hasScheduled) {
                        consumptionPlan.state ="executed"
                    }
                }
            }.bind(null, switchAction, consumptionPlan));
        });
    }


    public async scheduleConsumptionPlan(consumptionDuration: number, finishAt: number): Promise<PowerConsumerModel> {
        if (this.consumptionPlan != null && this.consumptionPlan.state == "processing") {
            throw new UserError("Current plan needs to be canceled!");
        }

        if ( consumptionDuration <= 0) {
            throw new UserError("Consumption duration should be grater than zero!");
        }

        if ( finishAt <= Date.now()) {
            throw new UserError("Finish at should be in the future!");
        }

        if ( Date.now() >= (finishAt - consumptionDuration)) {
            throw new UserError("Finish at is too early to execute whole required consumption duration time!");
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