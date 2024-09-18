interface IPricelistProvider {
    getPriceList(from: number, to:number): Promise<PricelistItem[]>;
}