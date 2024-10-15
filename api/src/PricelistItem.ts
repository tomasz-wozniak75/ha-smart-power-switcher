export interface PricelistItem {
    startsAt: number;
    duration: number;
    price: number;
    weight: number | null;
    category: "min" | "medium" | "max";
}