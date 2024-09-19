import { RdnPricelistProvider } from "./RdnPricelistProvider";
import puppeteer from "puppeteer";


test("should check date handling", () => {
    const cuurentTimestamp = Date.now()
    console.log("now: " + cuurentTimestamp);

    const now = new Date(cuurentTimestamp)
    console.log("now: " + now);
    console.log("now ISO: " + now.toISOString());
    console.log("now get time: " + now.getTime());
    console.log("now get hours: " + now.getHours());
  });


  test("check rdn page fetching", async () => {
    const rdnPricelistProvider = new  RdnPricelistProvider()

    await expect(rdnPricelistProvider.fetchPriceList(Date.now())).resolves.not.toBeNull()

  });


  test("puppeteer test", async () => {
    const getQuotes = async () => {
      const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
      });
    
      const page = await browser.newPage();
    
      await page.goto("https://tge.pl/energia-elektryczna-rdn?dateShow=18-09-2024&dateAction=prev", {
        waitUntil: "domcontentloaded",
      });

      
      const pricelistArray = await page.evaluate(() => {
          const pricelistArray = [];
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

    };


    
    await expect(getQuotes()).resolves.not.toBeNull()

  });