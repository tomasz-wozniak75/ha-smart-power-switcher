import { DateTimeUtils } from "smart-power-consumer-api";
import { PricelistItem } from "smart-power-consumer-api";
import { SingleDayPricelist } from "./SingleDayPricelist";


export class TimePeriodPricelistService {
    private singleDayPricelist: SingleDayPricelist;

    constructor(singleDayPricelist: SingleDayPricelist) {
        this.singleDayPricelist = singleDayPricelist;
    }

    public async getPriceList(fromTheTime: number, toTheTime: number): Promise<PricelistItem[]> {
        const fromTheDay = DateTimeUtils.cutOffTime(fromTheTime);
        const toTheDay = DateTimeUtils.cutOffTime(toTheTime);

        const pricelist: PricelistItem[] = [];
        for(let nextDay = fromTheDay; nextDay <= toTheDay; nextDay = DateTimeUtils.addDays(nextDay, 1)) {
           const singleDayPricelist = await this.singleDayPricelist.getPriceList(nextDay);
           pricelist.push(...singleDayPricelist.filter(item => (item.startsAt + item.duration) > fromTheTime && item.startsAt < toTheTime));     
        }

        return pricelist
    }

}