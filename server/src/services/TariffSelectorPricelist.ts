import { PricelistItem } from "smart-power-consumer-api";
import { SingleDayPricelist } from "./SingleDayPricelist";


export class TariffSelectorPricelist implements SingleDayPricelist {
    private singleDayPricelist: SingleDayPricelist
    
    constructor(singleDayPricelist: SingleDayPricelist) {
        this.singleDayPricelist = singleDayPricelist
    }


    getPriceList(forDay: number): Promise<PricelistItem[]> {
        return this.singleDayPricelist.getPriceList(forDay);
    }

}