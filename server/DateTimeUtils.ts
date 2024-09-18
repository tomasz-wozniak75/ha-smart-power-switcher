export class DateTimeUtils {

    public static cutOffTime(dateTime: number): number {
        const date = new Date(dateTime)

        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    }

}