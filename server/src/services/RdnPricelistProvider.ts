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
        const minimalPrice = 500;
        const transferCost = 9000;
        const priceses = await this.fetchPriceList(requestedDate);
        const priceslist = priceses
            .map((price) => (price <= 5 ? minimalPrice : price) + transferCost)
            .map((price, index) => ({ startsAt: new Date(requestedDate).setHours(index), duration: 60 * 60 * 1000, price: price, category: "medium" } as PricelistItem))
            .map((pricelistItem) => {
                if(pricelistItem.price === minimalPrice + transferCost) {
                    pricelistItem.category = "min"
                }
                if(pricelistItem.price >= 80000) {
                    pricelistItem.category = "max"
                }
                return pricelistItem;
            }
            );
        this.priceListCache[requestedDate] = priceslist;
        return priceslist;
    }

    getRdnUrl(requestedDate: number): string {
        const dayBefore = new Date(DateTimeUtils.addDays(requestedDate, -1));
        return `https://tge.pl/energia-elektryczna-rdn?dateShow=${DateTimeUtils.formatDate(dayBefore.getTime())}&dateAction=prev`
    }

    validatePriceListDate(requestedDate: number, contractDateText: string): void {
        const expectedDate = DateTimeUtils.formatDate(requestedDate);
                
        if ( `Kontrakty godzinowe dla dostawy w dniu ${expectedDate}` !== contractDateText) {
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
                        const price = Math.trunc(Number(priceText.replace(",", ".")) * 100);
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



