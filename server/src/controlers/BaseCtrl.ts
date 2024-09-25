import { NotFoundError } from "@/services/NotFoundError";
import { UserError } from "@/services/UserError";

export class BaseCtrl {

    protected getRequestNumericParam(path: string, paramName: string, required = true) {
        let value = null;
        const paramSplit = new RegExp(`${paramName}=(\d+)`, 'g').exec(path)
        
        if (paramSplit == null && required) {
            throw new UserError("Required param is missing: " + paramName)
        }

        if (paramSplit) {
            value = Number(paramSplit[1]);
        }

        return value;
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