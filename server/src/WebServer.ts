
import { NotFoundError } from './services/NotFoundError';
import { TariffSelectorPricelist } from './services/TariffSelectorPricelist'
import express from 'express';
import { W12PricelistProvider } from './services/W12PricelistProvider';
import path from 'path';

const webServer = express();
const singleDayPricelistService = new TariffSelectorPricelist( new W12PricelistProvider());

webServer.use(express.static(path.join(__dirname, 'webapp')))

webServer.get(/^\/pricelist\/\d\d-\d\d-\d\d\d\d$/, async (req, res)=>{
    const matchingResult = /(\d\d)-(\d\d)-(\d\d\d\d)$/.exec(req.path)
    const day = Number(matchingResult[1])
    const month = Number(matchingResult[2])
    const year = Number(matchingResult[3])
    
    const requestedDay = new Date(year, month-1, day)
    if ( requestedDay.getDate() != day || requestedDay.getMonth() != month-1 || requestedDay.getFullYear() != year ) {
        res.status(400);
        res.send(`Incorrect date: ${day}-${month}-${year}`);
        return
    }

    try {
        const pricelist = await singleDayPricelistService.getPriceList(requestedDay.getTime());
        res.status(200);
        res.json(pricelist)
    }catch (error) {
        if (error instanceof NotFoundError) {
            res.status(404);
            res.json({"message": error.message})
        } else {
            res.status(500);
            res.json({"message": error.message})
        }

    }
});

const PORT = process.env.PORT || 3000;
webServer.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
});