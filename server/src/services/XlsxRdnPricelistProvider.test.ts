import { expect, test, jest} from '@jest/globals';
import { XlsxRdnPricelistProvider } from "./XlsxRdnPricelistProvider.ts";


  test("check getRdnUrl", async () => {
    
  });

  test("check price list fetching", async () => {
    const rdnPricelistProvider = new  XlsxRdnPricelistProvider()

    await expect(rdnPricelistProvider.fetchPriceList(Date.now())).resolves.not.toBeNull()
  }, 60000);

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

    await expect(rdnPricelistProvider.getPriceList(new Date(2024, 8, 18).getTime())).resolves.not.toBeNull()

    jest.spyOn(rdnPricelistProvider, "fetchPriceList").mockImplementationOnce(() => { throw new Error("Should not be called")})

    await expect(rdnPricelistProvider.getPriceList(new Date(2024, 8, 18).getTime())).resolves.not.toBeNull()

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


