

export class DateTimeUtils {
    public static getTime(dateTime: number): string {
        const date = new Date(dateTime)

        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    public static formatDate(date: number): string {  
        const typedDate = new Date(date)
        const day = String(typedDate.getDate()).padStart(2, '0');
        const month = String(typedDate.getMonth() + 1).padStart(2, '0');
        return `${day}-${month}-${typedDate.getFullYear()}`
    }

}