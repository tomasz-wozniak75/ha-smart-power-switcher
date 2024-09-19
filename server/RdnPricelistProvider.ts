import { DateTimeUtils } from "./DateTimeUtils";
import { PricelistItem } from "./PricelistItem";



export class RdnPricelistProvider {
    private priceListCache: { [id: number]: PricelistItem[]; }

    public getPriceList(forDay: number): Promise<PricelistItem[]> {
        const requestedDate = DateTimeUtils.cutOffTime(forDay);

        if (this.priceListCache[requestedDate]) {
            return Promise.resolve(this.priceListCache[requestedDate]);
        }
        return Promise.resolve([]);

    }

    async getRawData(url: string): Promise<string> {
        const   headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7', 
            'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8,pl;q=0.7', 
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36', 
        }
        const response = await fetch(url, {headers});
        if (response.ok ) {
            return response.text();
        } else {
            console.log("Http status " + response.statusText)
            return response.statusText
        }
           
     };
    
    async fetchPriceList(requestedDate: number): Promise<string> {
        const page = await this.getRawData("https://tge.pl/energia-elektryczna-rdn?dateShow=17-09-2024&dateAction=prev").catch((error) => error)
        console.log(page);
        return page;
    }
}



