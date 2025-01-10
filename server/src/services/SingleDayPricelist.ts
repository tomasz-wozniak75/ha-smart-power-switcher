import { PricelistItem } from "smart-power-consumer-api";


export interface SingleDayPricelist {
    getPriceList(forDay: number): Promise<PricelistItem[]>;
}