export class DateTimeUtils {

    private static padTo2Digits(num: number) {
        return num.toString().padStart(2, '0');
    }

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


    public static formatDateForInput(miliseconds: number): string {
        const date = new Date(miliseconds)
        return `${date.getFullYear()}-${DateTimeUtils.padTo2Digits(date.getMonth() + 1)}-${DateTimeUtils.padTo2Digits(date.getDate())}`
    }

    public static formatDate(date: number): string {  
        const typedDate = new Date(date)
        const day = String(typedDate.getDate()).padStart(2, '0');
        const month = String(typedDate.getMonth() + 1).padStart(2, '0');
        return `${day}-${month}-${typedDate.getFullYear()}`
    }

    public static formatDateTime(date: number): string {  
        const typedDate = new Date(date)
        const day = String(typedDate.getDate()).padStart(2, '0');
        const month = String(typedDate.getMonth() + 1).padStart(2, '0');
        const hours = String(typedDate.getHours()).padStart(2, '0');
        const minutes = String(typedDate.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes} ${day}-${month}-${typedDate.getFullYear()}`
    }

    public static formatTime(milliseconds: number): string {  
        let seconds = Math.floor(milliseconds / 1000);
        let minutes = Math.floor(seconds / 60);
        let hours = Math.floor(minutes / 60);

        seconds = seconds % 60;
        minutes = minutes % 60;

        hours = hours % 24;

        return `${DateTimeUtils.padTo2Digits(hours)}h:${DateTimeUtils.padTo2Digits(minutes)}mins`;
    }

}