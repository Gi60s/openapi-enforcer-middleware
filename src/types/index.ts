import {MiddlewareRequestData, MiddlewareResponseData} from "../interfaces";

declare global {
    namespace Express {
        export interface Request {
            enforcer?: MiddlewareRequestData
        }

        export interface Response {
            enforcer?: MiddlewareResponseData
        }
    }
}