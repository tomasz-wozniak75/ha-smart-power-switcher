
import { SingleDayPricelist } from "@/services/SingleDayPricelist";
import { Express } from "express";
import { BaseCtrl } from "./BaseCtrl";

export class PricelistCtrl extends BaseCtrl {
 
    private  singleDayPricelistService: SingleDayPricelist;

    public constructor(singleDayPricelistService: SingleDayPricelist) {
        super();
        this.singleDayPricelistService = singleDayPricelistService;
    }

    public createRoutes(webServer: Express) {
        webServer.get(/^\/pricelist\/\d\d-\d\d-\d\d\d\d$/, async (req, res)=>{
            await this.getPricelist(req, res);
        });
    }
    
    public async getPricelist(req, res): Promise<void> {
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
            const pricelist = await this.singleDayPricelistService.getPriceList(requestedDay.getTime());
            res.status(200);
            res.json(pricelist)
        }catch (error) {
            this.handleErrors(error, res);
        }
    }

}