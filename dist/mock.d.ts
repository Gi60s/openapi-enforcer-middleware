import Express from "express";
import * as I from './interfaces';
export declare function getMockMode(req: Express.Request): I.MockMode | void;
export declare function mockHandler(req: Express.Request, res: Express.Response, next: Express.NextFunction, mock: I.MockMode): any;
export declare function mockMiddleware(): (req: Express.Request, res: Express.Response, next: Express.NextFunction) => void;
