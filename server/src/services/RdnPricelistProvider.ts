import { DateTimeUtils } from "smart-power-consumer-api";
import { NotFoundError } from "./NotFoundError";
import { PricelistItem } from "smart-power-consumer-api";
import puppeteer from "puppeteer";


export class RdnPricelistProvider {
    private priceListCache: { [forDay: number]: PricelistItem[]; } = {};

    public async getPriceList(forDay: number): Promise<PricelistItem[]> {
        const requestedDate = DateTimeUtils.cutOffTime(forDay);

        if (this.priceListCache[requestedDate]) {
            return this.priceListCache[requestedDate];
        }
        const priceses = await this.fetchPriceList(requestedDate);
        const priceslist = priceses
            .map((price) => price <= 5 ? 500 : price * 100)
            .map((price, index) => ({ startsAt: new Date(requestedDate).setHours(index), duration: 60 * 60 * 1000, price: price }));
        this.priceListCache[requestedDate] = priceslist;
        return priceslist;
    }

    getRdnUrl(requestedDate: number): string {
        const dayBefore = new Date(DateTimeUtils.addDays(requestedDate, -1));
        return `https://tge.pl/energia-elektryczna-rdn?dateShow=${DateTimeUtils.formatDate(dayBefore.getTime())}&dateAction=prev`
    }

    validatePriceListDate(requestedDate: number, contractDateText: string): void {
        const expectedDate = new Date(requestedDate);
        const day = String(expectedDate.getDate()).padStart(2, '0');
        const month = String(expectedDate.getMonth() + 1).padStart(2, '0');
        const year = expectedDate.getFullYear();
        
        if ( `Kontrakty godzinowe dla dostawy w dniu ${day}-${month}-${year}` !== contractDateText) {
            throw new NotFoundError("Missing price list for date: " + expectedDate);
        }
    }
   
    async fetchPriceList(requestedDate: number): Promise<number[]> {
        
        const browser = await puppeteer.launch({
            headless: true,
            defaultViewport: null,
          });
        
          const page = await browser.newPage();
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3419.0 Safari/537.36');
          await page.goto(this.getRdnUrl(requestedDate), { waitUntil: "domcontentloaded"});
    
          
          const parsingResult = await page.evaluate(() => {
                const result = { "contractDateText": null, pricelistArray: null};
                result['contractDateText'] = document.getElementsByClassName("kontrakt-date")?.item(0)?.innerText;
                if (result['contractDateText'] && document.getElementById("footable_kontrakty_godzinowe")) {
                    const pricelistArray: number[] = [];
                    const table = document.getElementById("footable_kontrakty_godzinowe") as HTMLTableElement
                    const rows: HTMLCollectionOf<HTMLTableRowElement> = table.rows
                    for(let r=2;  r < 2 + 24; r++ ){
                        const row = rows.item(r)
                        const priceText = row?.cells.item(1)?.innerText as string
                        const price = Number(priceText.replace(",", ""))
                        pricelistArray.push(price);
                        result['pricelistArray'] = pricelistArray;
                }
                }
                return result;
            }
        );
    
        await browser.close();
        this.validatePriceListDate(requestedDate, parsingResult['contractDateText']);
        return parsingResult['pricelistArray'];
    }

}



