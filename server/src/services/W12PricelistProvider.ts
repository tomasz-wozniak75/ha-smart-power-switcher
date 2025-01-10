import { DateTimeUtils } from "smart-power-consumer-api";
import { PricelistItem } from "smart-power-consumer-api";
import { SingleDayPricelist } from "./SingleDayPricelist";


export class W12PricelistProvider implements SingleDayPricelist {

    getPriceList(forDay: number): Promise<PricelistItem[]> {
        const requestedDate = new Date(DateTimeUtils.cutOffTime(forDay));
        
        const offPeakPrice = 80000;
        const inPeakPrice = 160000;
        const hour = 60 * 60 * 1000;
        const pricelist: PricelistItem[] = [];
        if (requestedDate.getDay() > 5) {
           for(let h=0; h<24; h++) {
            pricelist.push({ startsAt: requestedDate.getTime() + h*hour, duration: hour, price: offPeakPrice, category: "min"});
           }     
        } else {
            for(let h=0; h<24; h++) {
            pricelist.push({ 
                startsAt: requestedDate.getTime() + h*hour, 
                duration: hour, 
                ...((h<6 || h==13 || h == 14 || h > 21) ? {price: offPeakPrice, category: "min"}  : { price: inPeakPrice, category: "max"})
               }
            )
            }
        }

        return Promise.resolve(pricelist)
    }

}