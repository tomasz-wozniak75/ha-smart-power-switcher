import { expect, test, jest} from '@jest/globals';
import { TimePeriodPricelist as TimePeriodPricelistService } from "./TimePeriodPricelistService";
import { W12PricelistProvider } from './W12PricelistProvider';

    test("TimePeriodPricelist should return pricelist for request time in one pricelist unit", async () => {
        const timePeriodPricelistService: TimePeriodPricelistService = new TimePeriodPricelistService(new W12PricelistProvider())

        const startTime = new Date(2024, 8, 24, 13, 30);
        const endTime = new Date(2024, 8, 24, 13, 45);
        const priceList = await timePeriodPricelistService.getPriceList(startTime.getTime(), endTime.getTime())
        expect(priceList.length).toEqual(1)
    });

    test("TimePeriodPricelist should return pricelist for request time in two pricelista unit", async () => {
        const timePeriodPricelistService: TimePeriodPricelistService = new TimePeriodPricelistService(new W12PricelistProvider())

        const startTime = new Date(2024, 8, 24, 13, 30);
        const endTime = new Date(2024, 8, 24, 14, 45);
        const priceList = await timePeriodPricelistService.getPriceList(startTime.getTime(), endTime.getTime())
        expect(priceList.length).toEqual(2)
    });

    test("TimePeriodPricelist should return pricelist for request one day period", async () => {
        const timePeriodPricelistService: TimePeriodPricelistService = new TimePeriodPricelistService(new W12PricelistProvider())

        const startTime = new Date(2024, 8, 24, 13);
        const endTime = new Date(2024, 8, 25, 13);
        const priceList = await timePeriodPricelistService.getPriceList(startTime.getTime(), endTime.getTime())
        expect(priceList.length).toEqual(24)
    });