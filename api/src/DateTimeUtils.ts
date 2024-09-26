export class DateTimeUtils {

    public static getTime(dateTime: number): string {
        const date = new Date(dateTime)

        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    public static cutOffTime(dateTime: number): number {
        const date = new Date(dateTime)

        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    }

    public static addDays(date: number, days: number): number {  
        return date + days * 24 * 60 * 60 * 1000;
    }

    public static formatDate(date: number): string {  
        const typedDate = new Date(date)
        const day = String(typedDate.getDate()).padStart(2, '0');
        const month = String(typedDate.getMonth() + 1).padStart(2, '0');
        return `${day}-${month}-${typedDate.getFullYear()}`
    }

}