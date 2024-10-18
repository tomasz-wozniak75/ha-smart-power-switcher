
import express from 'express';
import path from 'path';
import { PricelistCtrl } from './controlers/PricelistCtrl';
import { TariffSelectorPricelist } from './services/TariffSelectorPricelist';
import { W12PricelistProvider } from './services/W12PricelistProvider';
import { PowerConsumersCtrl } from './controlers/PowerConsumersCtrl';
import { PowerConsumersService } from './services/PowerConsumersService';
import { TimePeriodPricelistService } from './services/TimePeriodPricelistService';
import { RdnPricelistProvider } from './services/RdnPricelistProvider';
import 'dotenv/config'
import fs from 'node:fs';
import { JobControler } from './audi-tracker/controlers/JobControler';
import { LocationTrackerService } from './audi-tracker/services/LocationTrackerService';
import { ChargingTrackerService } from './audi-tracker/services/ChargingTrackerService';
import { ChargingTrackerControler } from './audi-tracker/controlers/ChargingTrackerControler';





const webServer = express();

const singleDayPricelistService = new TariffSelectorPricelist( new RdnPricelistProvider());;
const pricelistCtrl = new PricelistCtrl(singleDayPricelistService);
const powerConsumersCtrl = new PowerConsumersCtrl(new PowerConsumersService(new TimePeriodPricelistService(singleDayPricelistService)));

const chargingTrackerService = new ChargingTrackerService(10 * 60 * 1000);
const jobControler  = new JobControler([new LocationTrackerService(10*60*1000), chargingTrackerService]);
const chargingTrackerControler = new ChargingTrackerControler(chargingTrackerService);

pricelistCtrl.createRoutes(webServer);
powerConsumersCtrl.createRoutes(webServer);
jobControler.createRoutes(webServer);
chargingTrackerControler.createRoutes(webServer);


webServer.use("/audi-tracker/traces", express.static(path.join(__dirname, 'audi-traces')))

webServer.use(express.static(path.join(__dirname, 'web-app')))

const getInputArgument = (name:string): string | null => {
    const argTuple = process.argv.find(item => item.startsWith(name));
    if (argTuple) {
        const splitedArgTuple = argTuple.split("=");
        if (splitedArgTuple.length > 1) {
            return splitedArgTuple[1];
        }
    }
    return null;
}


const PORT = process.env.PORT || 3000;
webServer.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');

    const pidFile = getInputArgument("pid-file")
    if (pidFile) {
        
        fs.writeFile(pidFile, process.pid + "", err => {
            if (err) {
                console.error(err);
            } else {
                console.log(`pid generated to file ${pidFile}`);
            }
        });
    }
});