import { RdnPricelistProvider } from "./RdnPricelistProvider"


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