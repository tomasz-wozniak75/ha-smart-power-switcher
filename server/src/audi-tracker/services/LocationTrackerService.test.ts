import { expect, test, jest} from '@jest/globals';
import { LocationTrackerService } from './LocationTrackerService';

test("validate refresh token", async () => {
    const locationTrackerService = new LocationTrackerService();

    const refreshToken = await locationTrackerService.refreshAccessToken();
    console.log("refreshToken: ", refreshToken)
    expect(refreshToken).not.toBeNull()
})


test("validate fetchParkingPosition", async () => {
    const locationTrackerService = new LocationTrackerService();

    const parkingPosition = await locationTrackerService.fetchParkingPosition();
    console.log("refreshToken: ", parkingPosition)
    expect(parkingPosition).not.toBeNull()
})