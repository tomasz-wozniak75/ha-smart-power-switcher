import { CurrencyUtils, DateTimeUtils } from "smart-power-consumer-api";
import { NotFoundError } from "./NotFoundError.ts";
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
        const dayBefore = new Date(DateTimeUtils.addDays(requestedDate, -1));
        return `https://tge.pl/energia-elektryczna-rdn?dateShow=${DateTimeUtils.formatDate(dayBefore.getTime())}&dateAction=prev`
    }

    validatePriceListDate(requestedDate: number, contractDateText: string): void {
        const expectedDate = DateTimeUtils.formatDate(requestedDate);
                
        if ( `Kontrakty godzinowe dla dostawy w dniu ${expectedDate}` !== contractDateText) {
            
            const today = DateTimeUtils.cutOffTime(Date.now())
            const messagePostfix = requestedDate > today ? ", for tomorrow pricelist is published at 2pm!" : ", pricelists are published for last 2 months!";

            throw new NotFoundError(`Missing price list for date: ${expectedDate}${messagePostfix}`);
        }
    }
   
    async fetchPriceList(requestedDate: number): Promise<number[]> {
        
        const browser = await puppeteer.launch({
            ...(process.env.PUPPETEER_BROWSER_VAR ? {executablePath: process.env.PUPPETEER_BROWSER_VAR}: {}),
            args: ['--no-sandbox'],
            headless: true,
            defaultViewport: null,
          });
        
          const page = await browser.newPage();
          await page.setUserAgent('curl/8.7.1');
          let response = await page.goto(this.getRdnUrl(requestedDate), { waitUntil: "domcontentloaded"});

          if (!response?.ok) {
            return []
          }
    
          
          const parsingResult = await page.evaluate(() => {
                const result = { contractDateText: "", pricelistArray: []};
                result['contractDateText'] = document.getElementsByClassName("kontrakt-date")?.item(0)?.innerText;
                const table = document.getElementsByClassName("table-rdb").item(1) as HTMLTableElement
                if (result['contractDateText'] && table) {
                    const pricelistArray: number[] = [];
                    const rows: HTMLCollectionOf<HTMLTableRowElement> = table.rows
                    for(let r=2;  r < rows.length; r++ ){
                        const row = rows.item(r)
                        const startingTime = row?.cells.item(0)?.innerText as string
                        if (!startingTime.includes("_H")) {
                            continue;
                        }
                        const priceText = row?.cells.item(7)?.innerText as string
                        if (priceText === "-") {
                           result['contractDateText'] = ""
                           return result
                        }
                        const price = Math.trunc(Number(priceText.replace(",", ".").replace(" ", "")) * 100);
                        pricelistArray.push(price);
                        if (pricelistArray.length == 24) {
                            break;
                        }
                    }
                result['pricelistArray'] = pricelistArray;
                }
                return result;
            }
        );
    
        await browser.close();
        this.validatePriceListDate(requestedDate, parsingResult['contractDateText']);
        return parsingResult['pricelistArray'];
    }

}



