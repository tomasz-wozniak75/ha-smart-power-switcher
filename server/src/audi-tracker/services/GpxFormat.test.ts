import { expect, test, jest} from '@jest/globals';
import { GpxFormat } from './GpxFormat';
import { DateTimeUtils } from 'smart-power-consumer-api';


test("validate convertion", async () => {
    const gpx = GpxFormat.convert(new Date(2024, 10,18).getTime(), [{
        lon: 16.92614,
        lat: 51.114835,
        carCapturedTimestamp: '2024-10-17T17:42:15Z'
      }]);
    console.log("gpx: ", gpx)
    expect(gpx).not.toBeNull()
})