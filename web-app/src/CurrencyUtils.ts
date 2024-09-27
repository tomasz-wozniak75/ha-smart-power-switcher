

export class CurrencyUtils {
    static format(amount: number): string {
        const shift = 100000;
        return String(Math.trunc(amount/shift*100)/100);
    }
}