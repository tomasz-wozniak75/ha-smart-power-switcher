import { PricelistItem } from "./PricelistItem";

export interface SingleDayPricelist {
    getPriceList(forDay: number): Promise<PricelistItem[]>;
}