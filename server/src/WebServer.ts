
import express from 'express';
import path from 'path';
import { PricelistCtrl } from './controlers/PricelistCtrl';

const webServer = express();
const pricelistCtrl = new PricelistCtrl()

webServer.use(express.static(path.join(__dirname, 'webapp')))

webServer.get(/^\/pricelist\/\d\d-\d\d-\d\d\d\d$/, async (req, res)=>{
    await pricelistCtrl.getPricelist(req, res);
});

const PORT = process.env.PORT || 3000;
webServer.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
});