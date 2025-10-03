import { CurrencyUtils, DateTimeUtils } from "smart-power-consumer-api";
import { NotFoundError } from "./NotFoundError.ts";
import * as XLSX from 'xlsx';
import { PricelistItem } from "smart-power-consumer-api";
import fs from 'node:fs';



export class XlsxRdnPricelistProvider {
    private priceListCache: { [forDay: number]: PricelistItem[]; } = {};

    public async getPriceList(forDay: number): Promise<PricelistItem[]> {
        const requestedDate = DateTimeUtils.cutOffTime(forDay);

        if (this.priceListCache[requestedDate]) {
            return this.priceListCache[requestedDate];
        }
        const minimalPrice = 500;
        const transferCost = 9000;
        const priceses = await this.fetchPriceList(requestedDate);
        const priceslist = priceses
            .map((price) => (price <= 5 ? minimalPrice : price) + transferCost)
            .map((price, index) => ({ startsAt: new Date(requestedDate).setHours(index), duration: 60 * 60 * 1000, price: price, category: "medium" } as PricelistItem))
            .map((pricelistItem) => {
                if(CurrencyUtils.getPriceAsNumber(pricelistItem.price) <= 0.2) {
                    pricelistItem.category = "min"
                }
                if(CurrencyUtils.getPriceAsNumber(pricelistItem.price) >= 0.8) {
                    pricelistItem.category = "max"
                }
                return pricelistItem;
            }
            );
        this.priceListCache[requestedDate] = priceslist;
        return priceslist;
    }

    getRdnUrl(requestedDate: number): string {
        const date = new Date(requestedDate)
        const formattedDate = `${date.getFullYear()}_${DateTimeUtils.padTo2Digits(date.getMonth() + 1)}_${DateTimeUtils.padTo2Digits(date.getDate())}`
        
        return `https://tge.pl/pub/TGE/SDAC%20${date.getFullYear()}/RDN/Raport_RDN_dzie_dostawy_delivery_day_${formattedDate}.xlsx`
    }

    validatePriceListDate(requestedDate: number, priceListHasBeenFound: boolean): void {
        const expectedDate = DateTimeUtils.formatDate(requestedDate);
                
        if ( !priceListHasBeenFound) {
            
            const today = DateTimeUtils.cutOffTime(Date.now())
            const messagePostfix = requestedDate > today ? ", for tomorrow pricelist is published at 2pm!" : ", pricelists are published for last 2 months!";

            throw new NotFoundError(`Missing price list for date: ${expectedDate}${messagePostfix}`);
        }
    }
   
    async fetchPriceList(requestedDate: number): Promise<number[]> {
        let priceListHasBeenFound = false;
        const pricelistArray: number[] = [];
        // const response = await fetch("https://tge.pl/pub/TGE/Wyniki%2015/RDN/Raport_RDN_dzie_dostawy_delivery_day_2025_10_02.xlsx", options)
        if ( priceListHasBeenFound) {
            const data = fs.readFileSync('/Users/tomaszw/Downloads/Raport_RDN_dzie_dostawy_delivery_day_2025_10_01.xlsx');
            const workbook = XLSX.read(data, {type: "array"});
            // Get the first sheet
            const sheet = workbook.Sheets[workbook.SheetNames[1]];

            // Convert the sheet to JSON
            const jsonData = XLSX.utils.sheet_to_json(sheet);
            const rowShift = 3;
            for(let r=rowShift;  r < rowShift + 24; r++ ){
                pricelistArray.push(jsonData[r]["__EMPTY_2"])
            }
            return pricelistArray

        } else {
            this.validatePriceListDate(requestedDate, priceListHasBeenFound);
            return pricelistArray;
        }
    }
    

}



