import { NotFoundError } from "@/services/NotFoundError";
import { UserError } from "@/services/UserError";

export class BaseCtrl {

    protected getRequestNumericParam(query: any, paramName: string, required = true) {
        const stringValue = query[paramName]        
        if (stringValue == null && required) {
            throw new UserError("Required param is missing: " + paramName)
        }

        if (stringValue) {
            return  Number(stringValue);
        }

        return null;
    }
    
    protected handleErrors(error: Error, res: any) {
        if (error instanceof NotFoundError) {
            res.status(404);
        } if (error instanceof UserError) {
            res.status(400);
        } else {
            res.status(500);
        }
        res.json({ "message": error.message });
    }

}