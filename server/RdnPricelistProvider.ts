

class RdnPricelistProvider {
    private priceListCache: { [id: number]: PricelistItem; }
     
    getPriceList(forDay: number): Promise<PricelistItem[]> {
        return new Promise();

    }
}