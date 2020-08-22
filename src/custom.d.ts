import * as I from './interfaces'

declare global {
    namespace Express {
        export interface Request {
            enforcer?: I.MiddlewareRequestData
        }
        export interface Response {
            enforcer?: I.MiddlewareResponseData
        }
    }
}