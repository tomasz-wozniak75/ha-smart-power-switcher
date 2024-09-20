import { RdnPricelistProvider } from "./RdnPricelistProvider";

test("should check date handling", () => {
    const cuurentTimestamp = new Date (2023, 11, 31).getTime()
    console.log("now: " + cuurentTimestamp);

    const now = new Date(cuurentTimestamp)
    console.log("now: " + now);
    console.log("now ISO: " + now.toISOString());
    console.log("now get time: " + now.getTime());
    console.log("now get hours: " + now.getHours());
    console.log("now get day: " + now.getDate());
    console.log("now get month: " + now.getMonth());
  });



  test("check getRdnUrl", async () => {
    const rdnPricelistProvider = new  RdnPricelistProvider()

    const expectedUrl = rdnPricelistProvider.getRdnUrl(new Date(2024,0,1).getTime())
    expect(expectedUrl).toEqual("https://tge.pl/energia-elektryczna-rdn?dateShow=31-12-2023&dateAction=prev")

    const expectedUrlWithPadding = rdnPricelistProvider.getRdnUrl(new Date(2024,0,2).getTime())
    expect(expectedUrlWithPadding).toEqual("https://tge.pl/energia-elektryczna-rdn?dateShow=01-01-2024&dateAction=prev")

    const expectedUrlWithNoPadding = rdnPricelistProvider.getRdnUrl(new Date(2024,9,11).getTime())
    expect(expectedUrlWithNoPadding).toEqual("https://tge.pl/energia-elektryczna-rdn?dateShow=10-10-2024&dateAction=prev")
  });

  test("check price list fetching", async () => {
    const rdnPricelistProvider = new  RdnPricelistProvider()

    await expect(rdnPricelistProvider.fetchPriceList(Date.now())).resolves.not.toBeNull()
  });

  test("price list vaidation should work", async () => {
    const rdnPricelistProvider = new  RdnPricelistProvider()

    await expect(rdnPricelistProvider.fetchPriceList(new Date(2023, 1, 1).getTime())).rejects.toThrow("Missing price list for date:");

});


