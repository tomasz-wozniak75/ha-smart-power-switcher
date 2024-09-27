
import express from 'express';
import path from 'path';
import { PricelistCtrl } from './controlers/PricelistCtrl';
import { TariffSelectorPricelist } from './services/TariffSelectorPricelist';
import { W12PricelistProvider } from './services/W12PricelistProvider';
import { PowerConsumersCtrl } from './controlers/PowerConsumersCtrl';
import { PowerConsumersService } from './services/PowerConsumersService';
import { TimePeriodPricelistService } from './services/TimePeriodPricelistService';
import { RdnPricelistProvider } from './services/RdnPricelistProvider';

const webServer = express();

const singleDayPricelistService = new TariffSelectorPricelist( new RdnPricelistProvider());;
const pricelistCtrl = new PricelistCtrl(singleDayPricelistService);
const powerConsumersCtrl = new PowerConsumersCtrl(new PowerConsumersService(new TimePeriodPricelistService(singleDayPricelistService)));

pricelistCtrl.createRoutes(webServer);
powerConsumersCtrl.createRoutes(webServer);

webServer.use(express.static(path.join(__dirname, 'web-app')))

const PORT = process.env.PORT || 3000;
webServer.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
});