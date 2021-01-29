import Express from 'express';
import * as I from './interfaces';
export declare function getInitStatus(req: Express.Request): {
    initialized: boolean;
    basePathMatch: boolean;
};
export declare function init(enforcerPromise: Promise<any>, options?: I.MiddlewareOptions): I.Middleware;
