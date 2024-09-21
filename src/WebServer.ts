
import { NotFoundError } from './server/NotFoundError';
import { TariffSelectorPricelist } from './server/TariffSelectorPricelist'
import express from 'express';

const webServer = express();
const PORT = 3000;

const singleDayPricelistService = new TariffSelectorPricelist();

webServer.get('/', (req, res)=>{
    res.status(200);
    res.send("Welcome to root URL of Server");
});

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

webServer.listen(PORT, (error) => {
    if(!error)
        console.log("Server is Successfully Running, and App is listening on port "+ PORT)
    else 
        console.log("Error occurred, server can't start", error);
    }
);