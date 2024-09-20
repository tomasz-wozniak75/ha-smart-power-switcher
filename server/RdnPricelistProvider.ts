import { DateTimeUtils } from "./DateTimeUtils";
import { PricelistItem } from "./PricelistItem";
import puppeteer from "puppeteer";


export class RdnPricelistProvider {
    private priceListCache: { [id: number]: PricelistItem[]; }

    public getPriceList(forDay: number): Promise<PricelistItem[]> {
        const requestedDate = DateTimeUtils.cutOffTime(forDay);

        if (this.priceListCache[requestedDate]) {
            return Promise.resolve(this.priceListCache[requestedDate]);
        }
        return Promise.resolve([]);

    }

    getRdnUrl(requestedDate: number): string {
        const dayBefore = new Date(DateTimeUtils.addDays(requestedDate, -1));
        const day = String(dayBefore.getDate()).padStart(2, '0');
        const month = String(dayBefore.getMonth() + 1).padStart(2, '0');
        return `https://tge.pl/energia-elektryczna-rdn?dateShow=${day}-${month}-${dayBefore.getFullYear()}&dateAction=prev`
    }
   
    async fetchPriceList(requestedDate: number): Promise<PricelistItem[]> {
        const browser = await puppeteer.launch({
            headless: true,
            defaultViewport: null,
          });
        
          const page = await browser.newPage();
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3419.0 Safari/537.36');
          await page.goto(this.getRdnUrl(requestedDate), { waitUntil: "domcontentloaded"});
    
          
          const pricelistArray = await page.evaluate(() => {
              const pricelistArray: PricelistItem[] = [];
              const table = document.getElementById("footable_kontrakty_godzinowe") as HTMLTableElement
              const rows: HTMLCollectionOf<HTMLTableRowElement> = table.rows
              for(let r=2;  r < 2 + 24; r++ ){
                const row = rows.item(r)
                const priceText = row?.cells.item(1)?.innerText as string
                let price = Number(priceText.replace(",", ""))
                price = price <= 5 ? 0.005 : price 
    
                pricelistArray.push(price)
              }
              console.log("rows: " + pricelistArray);
              return { text: pricelistArray }
          });
    
          // Display the quotes
          console.log(pricelistArray);
    
          // Close the browser
          await browser.close();

          return pricelistArray;
    }
}



