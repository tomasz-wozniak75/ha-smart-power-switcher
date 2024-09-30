export interface PricelistItem {
    startsAt: number;
    duration: number;
    price: number;
    category: "min" | "medium" | "max";
}