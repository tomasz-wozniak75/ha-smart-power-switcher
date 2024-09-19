export class PricelistItem {
    constructor(startsAt: number, duration: number, price: number) {
        this.startsAt = startsAt
        this.duration = duration
        this.price = price
    }

    startsAt: number
    duration: number
    price: number
}