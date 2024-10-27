import { PricelistItem, ConsumptionPlanItem, ConsumptionPlan, PowerConsumerModel, DateTimeUtils, SwitchAction, CurrencyUtils } from "smart-power-consumer-api";
import { TimePeriodPricelistService } from "./TimePeriodPricelistService";
import schedule from "node-schedule";
import { UserError } from "./UserError";
import { HomeAsistantService } from "./HomeAsistantService";
import { v4 as uuidv4 } from 'uuid';


export class PowerConsumer {
    private haDeviceName: string;
    private name: string;
    private consumptionPlan: ConsumptionPlan | null = null;
    private consumptionPlanStatelistenerUrl: string | null = null;
    private chargingStatusUrl?: string;

    private timePeriodPricelistService: TimePeriodPricelistService; 
    private homeAsistantService: HomeAsistantService;

    constructor(
        haDeviceName: string, name: string, timePeriodPricelist: TimePeriodPricelistService, homeAsistantService: HomeAsistantService, consumptionPlanStatelistenerUrl?: string, chargingStatusUrl?: string
    ) {
        this.haDeviceName = haDeviceName;
        this.name = name;
        this.timePeriodPricelistService = timePeriodPricelist;
        this.homeAsistantService = homeAsistantService;
        if (consumptionPlanStatelistenerUrl) {
            this.consumptionPlanStatelistenerUrl = consumptionPlanStatelistenerUrl;
        }
        this.chargingStatusUrl = chargingStatusUrl;
    }

    private sortConsumptionPlanByTime(consumptionPlan: ConsumptionPlanItem[]): ConsumptionPlanItem[]  {
        return [...consumptionPlan].sort((a, b) => a.pricelistItem.startsAt - b.pricelistItem.startsAt);
    }

    private sortPricelistByPrice(pricelist: PricelistItem[]): PricelistItem[]  {
        return [...pricelist].sort((a, b) => {
                    
                    if (a.price < b.price) return -1;
                    if (a.price > b.price) return 1;
                    if (a.weight && a.weight > b.weight) return -1;
                    if (a.weight && a.weight < b.weight) return 1;
                    if (a.startsAt < b.startsAt) return -1;
                    if (a.startsAt > b.startsAt) return 1;
                    return 0;
        });        
    }

    private applyConstraintsToDuration(pricelistItem: PricelistItem, startFrom: number, finishAt: number): number {
        let startsAt = pricelistItem.startsAt;
        let endAt = pricelistItem.startsAt + pricelistItem.duration;
        if(startsAt < startFrom && startFrom < endAt) {
            startsAt = startFrom;           
        }
        if(startsAt < finishAt && finishAt < endAt) {
            endAt = finishAt;           
        }
        return endAt - startsAt;
    }

    private calculatePriceItemsWeights(pricelist: PricelistItem[], startFrom: number, finishAt: number): PricelistItem[] {
        let currentPriceMin = 0;
        let currentPriceMax = 0;
        let weight = 0;
        let weightChangeIndex = 0;

        const aplyWeight = (from: number) => {
            for (let j=from-1; j>= weightChangeIndex; j--) {
                pricelist[j].weight = weight;
            }
        }

        for(let i = 0; i < pricelist.length; i++) {
            const pricelistItem = pricelist[i];
            const itemPrice = CurrencyUtils.getPriceAsNumber(pricelistItem.price);
            if( currentPriceMin <= itemPrice && itemPrice <= currentPriceMax) {
                weight += this.applyConstraintsToDuration(pricelistItem, startFrom, finishAt);
            } else {
                aplyWeight(i);
                currentPriceMin = CurrencyUtils.getPriceAsNumber(pricelistItem.price);
                currentPriceMax = currentPriceMin;
                weightChangeIndex = i;
                weight = this.applyConstraintsToDuration(pricelistItem, startFrom, finishAt);
            }
          
        }
        aplyWeight(pricelist.length);
        return pricelist;
    }

    private async selectPriceListItemsForConsumptionPlan(consumptionDuration: number, startFrom: number, finishAt: number): Promise<ConsumptionPlanItem[]> {
        const pricelist = JSON.parse(JSON.stringify(await this.timePeriodPricelistService.getPriceList(startFrom, finishAt)));
        const pricelistByPrice = this.sortPricelistByPrice(this.calculatePriceItemsWeights(pricelist, startFrom, finishAt));
        let currentConsumptionDuration = 0;
        const consumptionPlan: ConsumptionPlanItem[] = [];
        for(let pricelistItem of pricelistByPrice) {
            const pricelistItemDuration = this.applyConstraintsToDuration(pricelistItem, startFrom, finishAt);
            if (currentConsumptionDuration+pricelistItemDuration<=consumptionDuration) {
                currentConsumptionDuration+=pricelistItemDuration;
                consumptionPlan.push({pricelistItem, duration: pricelistItemDuration, switchActions: [] });
            }else {
                const delta = consumptionDuration - currentConsumptionDuration;
                if (delta > 0){
                    consumptionPlan.push({pricelistItem, duration: delta, switchActions: [] });
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

    private async executeSwitchAction(switchAction: SwitchAction): Promise<void> {
        if (switchAction.state == "scheduled") {
            switchAction.state = "executed";
            try{
                await this.homeAsistantService.switchDevice(this.haDeviceName, switchAction.switchOn);
                switchAction.result = "OK";
                console.log(`Switch action executed at ${DateTimeUtils.formatDateTime(Date.now())}`, switchAction);
            }catch(error) {
                switchAction.result = error.message;
                console.log(`Switch action executed at ${DateTimeUtils.formatDateTime(Date.now())}`, switchAction);
            }
        }
    }

    private switchConsumptionPlanState(consumptionPlan: ConsumptionPlan): void  {
        if(consumptionPlan.state == "processing") {
            let hasScheduled = false;
            for(let nextSwitchAction of consumptionPlan.consumptionPlanItems.flatMap((consumptionPlanItem) => consumptionPlanItem.switchActions)) {
                if (nextSwitchAction.state == "scheduled") {
                    hasScheduled = true;
                    break;
                }        
            }
            if (!hasScheduled) {
                consumptionPlan.state ="executed";
            }
        }
    }

    scheduleSwitchActions(consumptionPlan: ConsumptionPlan): void {
        const aThis = this;
        const schedulingThreshold = Date.now() + 60 * 1000;

        consumptionPlan.consumptionPlanItems.flatMap((consumptionPlanItem) => consumptionPlanItem.switchActions).forEach((switchAction) => {
            if (switchAction.at < schedulingThreshold) {
                switchAction.at = Date.now();
                aThis.executeSwitchAction(switchAction);
                aThis.switchConsumptionPlanState(consumptionPlan);
            } else {
                schedule.scheduleJob(switchAction.at, async function(switchAction: SwitchAction, consumptionPlan: ConsumptionPlan){
                    aThis.executeSwitchAction(switchAction);
                    aThis.switchConsumptionPlanState(consumptionPlan);
                    await aThis.sendConsumptionPlanStateNotification();
                    
                }.bind(null, switchAction, consumptionPlan));
            }
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

        if ( Date.now() > (finishAt - consumptionDuration)) {
            throw new UserError("Finish at is too early to execute required consumption duration time!");
        }

        this.consumptionPlan = {id: uuidv4(), createdAt: Date.now(), consumptionDuration, finishAt, consumptionPlanItems: await this.createConsumptionPlan(consumptionDuration, Date.now(), finishAt), state: "processing" };

        this.scheduleSwitchActions(this.consumptionPlan);
        await this.sendConsumptionPlanStateNotification();

        return this.getPowerConsumerModel();
    }


    public getPowerConsumerModel(): PowerConsumerModel {
        const now = new Date();
        const defaultFinishAt = now.getHours() < 16 ? now.getTime() + 2 * 3600 * 1000 : DateTimeUtils.addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7).getTime() , 1);
        return { id: this.haDeviceName, name: this.name, defaultConsumptionDuration: 90, defaultFinishAt,   consumptionPlan: this.consumptionPlan, chargingStatusUrl: this.chargingStatusUrl };
    }

    public async deleteConsumptionPlan(): Promise<PowerConsumerModel> {
        if (this.consumptionPlan && this.consumptionPlan.state == "processing") {
            const switchActions = this.consumptionPlan.consumptionPlanItems.flatMap((consumptionPlanItem) => consumptionPlanItem.switchActions);
            const consumptionPlanHasBeenStarted = switchActions[0].state === "executed";            
            let previousActionExecuted = consumptionPlanHasBeenStarted;
            for(let switchAction of switchActions) {
                if (switchAction.state != "executed") {
                    switchAction.state = "canceled";
                    if (previousActionExecuted && !switchAction.switchOn) {
                        const now = Date.now();
                        switchAction.result = `Canceled at ${DateTimeUtils.formatDateTime(now)}`;
                        switchAction.executedAt = now;
                    }
                    previousActionExecuted = false;
                }
            };
            this.consumptionPlan.state = consumptionPlanHasBeenStarted ? "executed" : "canceled";
            await this.homeAsistantService.switchDevice(this.haDeviceName, false);
            await this.sendConsumptionPlanStateNotification();
        }

        return this.getPowerConsumerModel();
    }

    private async sendConsumptionPlanStateNotification(): Promise<void> {
        if (this.consumptionPlanStatelistenerUrl) {
            if (this.consumptionPlan) {
                const response = await fetch(this.consumptionPlanStatelistenerUrl, { 
                    method: "post",
                    headers: {
                        "Content-Type": "application/json; charset=utf-8"
                    },
                    body: JSON.stringify(this.consumptionPlan), 
                });
                console.log(`ConsumptionPlanStateNotification set: ${response.statusText}`)
            }
        }
    }

}