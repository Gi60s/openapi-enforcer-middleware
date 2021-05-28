import Express from 'express';
import * as I from "./interfaces";
export declare type Controllers = Record<string, ControllersMap>;
export declare type ControllersMap = Record<string, Route>;
export declare type Route = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => any;
export declare function routeBuilder(openapi: any, controllers: Controllers, options?: I.RouteBuilderOptions): (req: Express.Request, res: Express.Response, next: Express.NextFunction) => void;
