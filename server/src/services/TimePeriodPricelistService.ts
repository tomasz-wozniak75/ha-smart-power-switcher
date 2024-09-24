import { DateTimeUtils } from "./DateTimeUtils";
import { PricelistItem } from "./PricelistItem";
import { SingleDayPricelist } from "./SingleDayPricelist";


export class TimePeriodPricelistService {
    private singleDayPricelist: SingleDayPricelist;

    constructor(singleDayPricelist: SingleDayPricelist) {
        this.singleDayPricelist = singleDayPricelist;
    }

    public async getPriceList(fromTheTime: number, toTheTime: number): Promise<PricelistItem[]> {
        const fromTheDay = DateTimeUtils.cutOffTime(fromTheTime);
        const totheDay = DateTimeUtils.cutOffTime(toTheTime);

        const pricelist: PricelistItem[] = [];
        for(let nextDay = fromTheDay; nextDay <= totheDay; nextDay = DateTimeUtils.addDays(nextDay, 1)) {
           const singleDayPricelist = await this.singleDayPricelist.getPriceList(nextDay);
           pricelist.push(...singleDayPricelist.filter(item => (item.startsAt + item.duration) > fromTheTime && item.startsAt < toTheTime));     
        }

        return pricelist
    }

}