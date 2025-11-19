import { PricelistItem } from "smart-power-consumer-api";


export interface SingleDayPricelist {
    getPriceList(forDay: number): Promise<PricelistItem[]>;
    getPriceListWithGivenItemDuration(forDay: number, withItemDuration: number): Promise<PricelistItem[]>;
}