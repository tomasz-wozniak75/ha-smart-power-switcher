import { expect, test, jest} from '@jest/globals';
import { ChargingTrackerService } from './ChargingTrackerService';

test("validate fetchCarStatus", async () => {
    const chargingTrackerService = new ChargingTrackerService();

    const carStatus = await chargingTrackerService.fetchCarStatus();
    console.log("carStatus: ", JSON.stringify(carStatus));
    expect(carStatus).not.toBeNull()
})
