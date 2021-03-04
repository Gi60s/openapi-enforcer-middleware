import {RequestHandler, ErrorRequestHandler, NextFunction as OriginalNextFunction} from 'express-serve-static-core'

export = OpenApiEnforcerMiddleware

declare class OpenApiEnforcerMiddleware {
    constructor (definition: string|object, options?:OpenApiEnforcerMiddleware.Options );

    controllers (controllersDirectoryPath: string|object, ...dependencyInjection: any): Promise<object>;
    middleware (): RequestHandler;
    mocks (controllersDirectoryPath: string|object|undefined, automatic?: boolean, ...dependencyInjection: any): Promise<object>;
    use (middleware: OpenApiEnforcerMiddleware.MiddlewareFunction): void;

    promise: Promise<object>
}

declare namespace OpenApiEnforcerMiddleware {

    export type MiddlewareFunction = RequestHandler | ErrorRequestHandler

    export type NextFunction = OriginalNextFunction

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
