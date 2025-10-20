import { CurrencyUtils, DateTimeUtils } from "smart-power-consumer-api";
import { NotFoundError } from "./NotFoundError.ts";
import * as XLSX from 'xlsx';
import { PricelistItem } from "smart-power-consumer-api";




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

    getRdnUrl(requestedDate: number, postfix: string): string {
        const date = new Date(requestedDate)
        const formattedDate = `${date.getFullYear()}_${DateTimeUtils.padTo2Digits(date.getMonth() + 1)}_${DateTimeUtils.padTo2Digits(date.getDate())}`
        
        return `https://tge.pl/pub/TGE/A_SDAC%20${date.getFullYear()}/RDN/Raport_RDN_dzie_dostawy_delivery_day_${formattedDate}${postfix}.xlsx`
    }

    getBackupUrl(requestedDate: number): string {
        const date = new Date(requestedDate)
        const formattedDate = `${date.getFullYear()}_${DateTimeUtils.padTo2Digits(date.getMonth() + 1)}_${DateTimeUtils.padTo2Digits(date.getDate())}`
        
        return `http://smart-energy.mesh:8080/backup-price-lists/${formattedDate}.xlsx`
    }

    validatePriceListDate(requestedDate: number): void {
        const expectedDate = DateTimeUtils.formatDate(requestedDate);
                
        const today = DateTimeUtils.cutOffTime(Date.now())
        const messagePostfix = requestedDate > today ? ", for tomorrow pricelist is published at 2pm!" : ", pricelists are published for last 2 months!";

        throw new NotFoundError(`Missing price list for date: ${expectedDate}${messagePostfix}`);
    }
   
    async fetchPriceList(requestedDate: number): Promise<number[]> {
        const possiblePostfixes = ["", "_1", "_2", "ost"]
        let fetchSuccess = false

        for(const postfix of possiblePostfixes) {
            const url = this.getRdnUrl(requestedDate, postfix)
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    'User-Agent': 'curl/8.7.1',
                },
            })
    
            if (response.ok && response.headers.get("Content-Type") === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
                fetchSuccess = true
                return await this.parsePriceList(response);
            } 
        }

        if (!fetchSuccess)         {
            const backupUrl = this.getBackupUrl(requestedDate)
            const response = await fetch(backupUrl, {
                method: "GET",
             })
             if (response.ok) {
                return await this.parsePriceList(response);
             } 
            this.validatePriceListDate(requestedDate);
            return [];
        }
        return []
    }

    async parsePriceList(response: Response): Promise<number[]> {
        const pricelistArray: number[] = [];
        const data = await response.arrayBuffer()
        const workbook = XLSX.read(data, {type: "array"});
        const sheet = workbook.Sheets[workbook.SheetNames[1]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const rowShift = 3;
        for(let r=rowShift;  r < rowShift + 24; r++ ){
            const price = Math.trunc(jsonData[r]["__EMPTY_2"] * 100);
            pricelistArray.push(price)
        }
        return pricelistArray
    }
    

}



