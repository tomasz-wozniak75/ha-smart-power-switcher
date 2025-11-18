import { expect, test, jest} from '@jest/globals';
import { RdnPricelistProvider } from "./RdnPricelistProvider";


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

  test("price list vaidation should work - past", async () => {
    const rdnPricelistProvider = new  RdnPricelistProvider()

    await expect(rdnPricelistProvider.fetchPriceList(new Date(2023, 1, 1).getTime())).rejects.toThrow("Missing price list for date:");

  });

  test("price list vaidation should work - future", async () => {
    const rdnPricelistProvider = new  RdnPricelistProvider()

    await expect(rdnPricelistProvider.fetchPriceList(new Date(2024, 10, 11).getTime())).rejects.toThrow("Missing price list for date:");

  });


  test("getPriceList should fetch price list for the first time, second time it should use cache", async () => {
    const rdnPricelistProvider = new  RdnPricelistProvider()

    await expect(rdnPricelistProvider.getPriceList(new Date(2025, 10, 19).getTime())).resolves.not.toBeNull()

    jest.spyOn(rdnPricelistProvider, "fetchPriceList").mockImplementationOnce(() => { throw new Error("Should not be called")})

    await expect(rdnPricelistProvider.getPriceList(new Date(2025, 10, 19).getTime())).resolves.not.toBeNull()

  });

  test("price List items should should be adjacent", async () => {
      const rdnPricelistProvider = new  RdnPricelistProvider()

      const pricelist = await rdnPricelistProvider.getPriceList(new Date(2024, 8, 18).getTime())
      let allAdjecent = true;
      let startsAt = pricelist[0].startsAt
      for(let item of pricelist){
        if ( startsAt !== item.startsAt) {
          allAdjecent = false;
          break;
        }
        startsAt = item.startsAt + item.duration;
      }
      expect(allAdjecent).toBeTruthy()
  });


