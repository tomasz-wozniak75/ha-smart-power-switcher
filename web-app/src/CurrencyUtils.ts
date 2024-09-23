

export class CurrencyUtils {
    static format(amount: number): string {
        const shift = 100000;
        return  Math.trunc(amount/100000) + "," + Math.trunc(((amount % shift) / (shift/10)));
    }
}