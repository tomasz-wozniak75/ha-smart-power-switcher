import { DateTimeUtils } from "./DateTimeUtils";


class RdnPricelistProvider {
    private priceListCache: { [id: number]: PricelistItem[]; }

    public getPriceList(forDay: number): Promise<PricelistItem[]> {
        const requestedDate = DateTimeUtils.cutOffTime(forDay);

        if (this.priceListCache[requestedDate]) {
            return Promise.resolve(this.priceListCache[requestedDate]);
        }
        return this.fetchPriceList(requestedDate);

    }
    
    private fetchPriceList(requestedDate: number): Promise<PricelistItem[]> {
        throw new Error("Method not implemented.");
    }
}