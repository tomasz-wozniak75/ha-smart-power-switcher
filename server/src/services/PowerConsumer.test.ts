import { expect, test, describe} from '@jest/globals';
import { TimePeriodPricelistService as TimePeriodPricelistService } from "./TimePeriodPricelistService";
import { W12PricelistProvider } from './W12PricelistProvider';
import { ConsumptionPlanItem } from 'smart-power-consumer-api';
import { PowerConsumer } from './PowerConsumer';
import { HomeAsistantService } from './HomeAsistantService';


const collectSwitchActions = (consumptionPanItems: ConsumptionPlanItem[]) => consumptionPanItems.flatMap( item => item.switchActions)

describe("PowerConsumer tests", () => {
    test("consumptionPanItems two hours in the night in W12", async () => {
        const timePeriodPricelistService: TimePeriodPricelistService = new TimePeriodPricelistService(new W12PricelistProvider())
        const powerConsumer = new PowerConsumer("audi-charger", "Audi charger", timePeriodPricelistService, new HomeAsistantService())

        const startTime = new Date(2024, 8, 24, 19, 30);
        const endTime = new Date(2024, 8, 25);
        const consumptionPanItems = await powerConsumer.createConsumptionPlan(90*60*1000, startTime.getTime(), endTime.getTime())
        console.log(JSON.stringify(consumptionPanItems))
        expect(consumptionPanItems.length).toEqual(2)

        const switchActions = collectSwitchActions(consumptionPanItems)
        console.log(JSON.stringify(switchActions))
        expect(switchActions.length).toEqual(2)
        expect(switchActions[0].switchOn).toEqual(true)
        expect(switchActions[0].at).toEqual(new Date(2024, 8, 24, 22).getTime())

        expect(switchActions[1].switchOn).toEqual(false)
        expect(switchActions[1].at).toEqual(new Date(2024, 8, 24, 23, 30).getTime())
    });



    test("consumptionPanItems one hour in the night in W12", async () => {
        const timePeriodPricelistService: TimePeriodPricelistService = new TimePeriodPricelistService(new W12PricelistProvider())
        const powerConsumer = new PowerConsumer("audi-charger", "Audi charger", timePeriodPricelistService, new HomeAsistantService())

        const startTime = new Date(2024, 8, 24, 19, 30);
        const endTime = new Date(2024, 8, 24, 23);
        const consumptionPanItems = await powerConsumer.createConsumptionPlan(60*60*1000, startTime.getTime(), endTime.getTime())
        console.log(JSON.stringify(consumptionPanItems))
        expect(consumptionPanItems.length).toEqual(1)

        const switchActions = collectSwitchActions(consumptionPanItems)
        console.log(JSON.stringify(switchActions))
        expect(switchActions.length).toEqual(2)
        expect(switchActions[0].switchOn).toEqual(true)
        expect(switchActions[0].at).toEqual(new Date(2024, 8, 24, 22).getTime())

        expect(switchActions[1].switchOn).toEqual(false)
        expect(switchActions[1].at).toEqual(new Date(2024, 8, 24, 23).getTime())
    });


    test("consumptionPanItems do not start in the past", async () => {
        const timePeriodPricelistService: TimePeriodPricelistService = new TimePeriodPricelistService(new W12PricelistProvider())
        const powerConsumer = new PowerConsumer("audi-charger", "Audi charger", timePeriodPricelistService, new HomeAsistantService())

        const startTime = new Date(2024, 8, 24, 23, 20);
        const endTime = new Date(2024, 8, 24, 23, 30);
        const consumptionPanItems = await powerConsumer.createConsumptionPlan(5*60*1000, startTime.getTime(), endTime.getTime())
        console.log(JSON.stringify(consumptionPanItems))
        expect(consumptionPanItems.length).toEqual(1)

        const switchActions = collectSwitchActions(consumptionPanItems)
        console.log(JSON.stringify(switchActions))
        expect(switchActions.length).toEqual(2)
        expect(switchActions[0].switchOn).toEqual(true)
        expect(switchActions[0].at).toEqual(new Date(2024, 8, 24, 23, 25).getTime())

        expect(switchActions[1].switchOn).toEqual(false)
        expect(switchActions[1].at).toEqual(new Date(2024, 8, 24, 23, 30).getTime())
    });


    test("consumptionPanItems  two hours, one in the noon and one in the night in W12", async () => {
        const timePeriodPricelistService: TimePeriodPricelistService = new TimePeriodPricelistService(new W12PricelistProvider())
        const powerConsumer = new PowerConsumer("audi-charger", "Audi charger", timePeriodPricelistService, new HomeAsistantService())

        const startTime = new Date(2024, 8, 24, 14);
        const endTime = new Date(2024, 8, 24, 23);
        const consumptionPanItems = await powerConsumer.createConsumptionPlan(120*60*1000, startTime.getTime(), endTime.getTime())
        console.log(JSON.stringify(consumptionPanItems))
        expect(consumptionPanItems.length).toEqual(2)

        const switchActions = collectSwitchActions(consumptionPanItems)
        console.log(JSON.stringify(switchActions))
        expect(switchActions.length).toEqual(4)
        expect(switchActions[0].switchOn).toEqual(true)
        expect(switchActions[0].at).toEqual(new Date(2024, 8, 24, 14).getTime())
        
        expect(switchActions[1].switchOn).toEqual(false)
        expect(switchActions[1].at).toEqual(new Date(2024, 8, 24, 15).getTime())

        expect(switchActions[2].switchOn).toEqual(true)
        expect(switchActions[2].at).toEqual(new Date(2024, 8, 24, 22).getTime())

        expect(switchActions[3].switchOn).toEqual(false)
        expect(switchActions[3].at).toEqual(new Date(2024, 8, 24, 23).getTime())
    });


    test("consumptionPanItems  more than two hour one in noon and one in the night in W12", async () => {
        const timePeriodPricelistService: TimePeriodPricelistService = new TimePeriodPricelistService(new W12PricelistProvider())
        const powerConsumer = new PowerConsumer("audi-charger", "Audi charger", timePeriodPricelistService, new HomeAsistantService())

        const startTime = new Date(2024, 8, 24, 14);
        const endTime = new Date(2024, 8, 24, 23);
        const consumptionPanItems = await powerConsumer.createConsumptionPlan(130*60*1000, startTime.getTime(), endTime.getTime())
        console.log(JSON.stringify(consumptionPanItems))
        expect(consumptionPanItems.length).toEqual(3)

        const switchActions = collectSwitchActions(consumptionPanItems)
        console.log(JSON.stringify(switchActions))
        expect(switchActions.length).toEqual(4)
        expect(switchActions[0].switchOn).toEqual(true)
        expect(switchActions[0].at).toEqual(new Date(2024, 8, 24, 14).getTime())
        
        expect(switchActions[1].switchOn).toEqual(false)
        expect(switchActions[1].at).toEqual(new Date(2024, 8, 24, 15, 10).getTime())

        expect(switchActions[2].switchOn).toEqual(true)
        expect(switchActions[2].at).toEqual(new Date(2024, 8, 24, 22).getTime())

        expect(switchActions[3].switchOn).toEqual(false)
        expect(switchActions[3].at).toEqual(new Date(2024, 8, 24, 23).getTime())
    });
});

