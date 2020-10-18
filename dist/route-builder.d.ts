import Express from 'express';
import * as I from "./interfaces";
export declare function routeBuilder(enforcerPromise: Promise<any>, dirPath: string, options?: I.RouteBuilderOptions): (req: Express.Request, res: Express.Response, next: Express.NextFunction) => void;
