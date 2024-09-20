import { PricelistItem } from "./PricelistItem";
import { RdnPricelistProvider } from "./RdnPricelistProvider";
import { SingleDayPricelist } from "./SingleDayPricelist";


export class TariffSelectorPricelist implements SingleDayPricelist {
    private rdnPricelistProvider = new RdnPricelistProvider()

    getPriceList(forDay: number): Promise<PricelistItem[]> {
        return this.rdnPricelistProvider.getPriceList(forDay);
    }

}