import { on } from './events';
import { Controllers } from './route-builder';
import * as I from './interfaces';
export { Controllers as RouteControllersMap, ControllersMap as RouteControllerMap } from './route-builder';
export { RouteBuilderOptions as RouteOptions, MiddlewareOptions as InitOptions } from './interfaces';
export { PartialDocsOptions as DocsOptions } from './docs';
export default function OpenAPIEnforcerMiddleware(openapi: any): {
    docs(options?: Partial<Partial<import("./docs").DocsOptions>> | undefined): (req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>, res: import("express").Response<any, Record<string, any>>) => Promise<void>;
    init(options?: I.MiddlewareOptions | undefined): I.Middleware;
    mock(): (req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>, res: import("express").Response<any, Record<string, any>>, next: import("express").NextFunction) => void;
    on: typeof on;
    route(controllers: Controllers, options?: I.RouteBuilderOptions | undefined): (req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>, res: import("express").Response<any, Record<string, any>>, next: import("express").NextFunction) => void;
};
