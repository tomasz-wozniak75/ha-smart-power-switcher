import { DateTimeUtils } from "smart-power-consumer-api";
import { PricelistItem } from "./PricelistItem";
import { SingleDayPricelist } from "./SingleDayPricelist";


export class W12PricelistProvider implements SingleDayPricelist {

    getPriceList(forDay: number): Promise<PricelistItem[]> {
        const requestedDate = new Date(DateTimeUtils.cutOffTime(forDay));
        
        const offPeakPrice = 80000;
        const inPeakPrice = 160000;
        const hour = 60 * 60 * 1000;
        const pricelist: PricelistItem[] = [];
        if (requestedDate.getDay() > 4) {
           for(let h=0; h<24; h++) {
            pricelist.push(new PricelistItem(requestedDate.getTime() + h*hour, hour, offPeakPrice));
           }     
        } else {
            for(let h=0; h<24; h++) {
            pricelist.push(new PricelistItem(requestedDate.getTime() + h*hour, hour, (h<6 || h==13 || h == 14 || h > 21) ? offPeakPrice : inPeakPrice));
           }
        }

        return Promise.resolve(pricelist)
    }

}