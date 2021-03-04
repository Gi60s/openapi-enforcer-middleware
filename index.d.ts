import {RequestHandler, ErrorRequestHandler, NextFunction as OriginalNextFunction} from 'express-serve-static-core'

export = OpenApiEnforcerMiddleware

declare class OpenApiEnforcerMiddleware {
    constructor (definition: string|object, options?:OpenApiEnforcerMiddleware.Options );

    controllers<T extends unknown[]> (controllersDirectoryPath: string | OpenApiEnforcerMiddleware.ControllersMap, ...dependencyInjection: T): Promise<object>;
    middleware (): OpenApiEnforcerMiddleware.MiddlewareFunction;
    mocks<T extends unknown[]> (controllersDirectoryPath?: string | OpenApiEnforcerMiddleware.ControllersMap, automatic?: boolean, ...dependencyInjection: T): Promise<object>;
    use (middleware: OpenApiEnforcerMiddleware.MiddlewareFunction): void;

    promise: Promise<object>
}

declare namespace OpenApiEnforcerMiddleware {

    export type MiddlewareFunction = RequestHandler | ErrorRequestHandler

    export type NextFunction = OriginalNextFunction

    export type Controllers = Record<string, MiddlewareFunction>

    export type ControllersMap = Record<string, Controllers>

    export interface Options {
        allowOtherQueryParameters?: boolean;
        componentOptions?: object;
        fallThrough?: boolean;
        mockHeader?: string;
        mockQuery?: string;
        reqMockProperty?: string;
        reqOpenApiProperty?: string;
        reqOperationProperty?: string;
        resSerialize?: boolean;
        resValidate?: boolean;
        xController?: string;
        xOperation?: string;
    }
}
