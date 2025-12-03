import { CurrencyUtils, DateTimeUtils } from "smart-power-consumer-api";
import { NotFoundError } from "./NotFoundError.ts";
import { PricelistItem } from "smart-power-consumer-api";
import puppeteer from "puppeteer";


export class RdnPricelistProvider {
    private hour = 60 * 60 * 1000
    private fifteenMinutes = 15 * 60 * 1000
    private currentItemDuration: number = this.hour;
    private priceListCache: { [forDay: number]: PricelistItem[]; } = {};
    private quarterBasedPriceListCache: { [forDay: number]: PricelistItem[]; } = {};

    public async getPriceListWithGivenItemDuration(forDay: number, withItemDuration: number): Promise<PricelistItem[]> {
        if (withItemDuration === this.fifteenMinutes) {
            this.currentItemDuration = this.fifteenMinutes;
        } else {
            this.currentItemDuration = this.hour;
        }
        return await this.getPriceList(forDay);
    }

    public async getPriceList(forDay: number): Promise<PricelistItem[]> {
        const requestedDate = DateTimeUtils.cutOffTime(forDay);
        let durationType = "_H"
        let periodDuration = this.hour;
        let currentPriceListCache: { [forDay: number]: PricelistItem[]; } = this.priceListCache;

        if (this.currentItemDuration === this.fifteenMinutes) {
            durationType = "_Q"
            periodDuration = this.fifteenMinutes;
            currentPriceListCache = this.quarterBasedPriceListCache;
        }

        if(currentPriceListCache[requestedDate]) {
            return currentPriceListCache[requestedDate];
        }

        const minimalPrice = 500;
        const transferCost = 9000;


        const priceses = await this.fetchPriceList(requestedDate, durationType);
        const priceslist = priceses
            .map((price) => (price <= 5 ? minimalPrice : price) + transferCost)
            .map((price, index) => ({ startsAt: requestedDate+index*periodDuration, duration: periodDuration, price: price, category: "medium" } as PricelistItem))
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
        currentPriceListCache[requestedDate] = priceslist;
        priceslist.forEach( item => console.log(DateTimeUtils.getTime(item.startsAt)))
        return priceslist;
    }

    getRdnUrl(requestedDate: number): string {
        const dayBefore = new Date(DateTimeUtils.addDays(requestedDate, -1));
        return `https://tge.pl/energia-elektryczna-rdn?dateShow=${DateTimeUtils.formatDate(dayBefore.getTime())}&dateAction=prev&type=0`
    }

    validatePriceListDate(requestedDate: number, contractDateText: string): void {
        const expectedDate = DateTimeUtils.formatDate(requestedDate);
                
        if ( `Kontrakty dla dostawy w dniu ${expectedDate}` !== contractDateText) {
            
            const today = DateTimeUtils.cutOffTime(Date.now())
            const messagePostfix = requestedDate > today ? ", for tomorrow pricelist is published at 2pm!" : ", pricelists are published for last 2 months!";

            throw new NotFoundError(`Missing price list for date: ${expectedDate}${messagePostfix}`);
        }
    }
   
    async fetchPriceList(requestedDate: number, durationType: string): Promise<number[]> {
        
        const browser = await puppeteer.launch({
            ...(process.env.PUPPETEER_BROWSER_VAR ? {executablePath: process.env.PUPPETEER_BROWSER_VAR}: {}),
            args: ['--no-sandbox'],
            headless: true,
            defaultViewport: null,
          });
        
          const page = await browser.newPage();
          await page.setUserAgent('curl/8.7.1');
          const url = this.getRdnUrl(requestedDate);
          let response = await page.goto(url, { waitUntil: "domcontentloaded"});
          
          if (!response?.ok) {
            return []
          }
          await page.waitForSelector(".table-rdb");

          const bodyHandle = await page.evaluateHandle(() => {
            return document.body;
          });

          let contractDateText = await bodyHandle.$eval(".kontrakt-date", node => node.innerText);
         
          const table = await page.evaluateHandle(() => {
            return document.getElementsByClassName("table-rdb").item(1);
          });

          const pricelistArray = await table.$$eval('tr', (rows, durationType)  => {
                const pricelistArray: number[] = [];
                for(let r=2;  r < rows.length; r++ ){
                    const row = rows[r];
                    const startingTime = row?.cells.item(0)?.innerText as string
                    if (!startingTime.includes(durationType)) {
                        continue;
                    }
                    const priceText = row?.cells.item(7)?.innerText as string
                    if (priceText === "-") {
                        return []
                    }
                    const price = Math.trunc(Number(priceText.replace(",", ".").replace(" ", "")) * 100);
                    pricelistArray.push(price);
                }
                return pricelistArray;
            }, durationType
          );

        if (pricelistArray.length === 0) {
            contractDateText = "";
        }  

          
        await browser.close();
        this.validatePriceListDate(requestedDate, contractDateText);
        return pricelistArray;
    }

}



