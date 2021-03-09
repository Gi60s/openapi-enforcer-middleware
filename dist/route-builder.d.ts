import Express from 'express';
import * as I from "./interfaces";
export declare type IDependencies = Array<any> | DependencyMap;
export interface DependencyMap {
    [key: string]: Array<any>;
}
export declare function routeBuilder(enforcerPromise: Promise<any>, dirPath: string, dependencies?: IDependencies, options?: I.RouteBuilderOptions): (req: Express.Request, res: Express.Response, next: Express.NextFunction) => void;