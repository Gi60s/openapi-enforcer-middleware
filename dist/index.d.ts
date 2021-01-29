import { on } from './events';
import * as I from './interfaces';
import { DocsOptions } from './docs';
export = OpenAPIEnforcerMiddleware;
declare function OpenAPIEnforcerMiddleware(enforcerPromise: Promise<any>): {
    docs(options?: Partial<DocsOptions> | undefined): (req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>, res: import("express").Response<any, Record<string, any>>, next: import("express").NextFunction) => void;
    init(options?: I.MiddlewareOptions | undefined): I.Middleware;
    mock(): (req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>, res: import("express").Response<any, Record<string, any>>, next: import("express").NextFunction) => void;
    on: typeof on;
    route(controllersDir: string, dependencies?: any[] | import("./route-builder").DependencyMap | undefined, options?: I.RouteBuilderOptions | undefined): (req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>, res: import("express").Response<any, Record<string, any>>, next: import("express").NextFunction) => void;
};
declare namespace OpenAPIEnforcerMiddleware {
    var _a: typeof OpenAPIEnforcerMiddleware;
    export { _a as default };
}
