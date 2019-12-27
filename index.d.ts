
export = OpenApiEnforcerMiddleware

declare class OpenApiEnforcerMiddleware {
    constructor (definition: string|object, options?:OpenApiEnforcerMiddleware.Options );

    controllers (controllersDirectoryPath: string|object, ...dependencyInjection: any): Promise<object>;
    middleware (): OpenApiEnforcerMiddleware.MiddlewareFunction;
    mocks (controllersDirectoryPath: string|object|undefined, automatic?: boolean, ...dependencyInjection: any): Promise<object>;
    use (middleware: OpenApiEnforcerMiddleware.MiddlewareFunction): void;

    promise: Promise<object>
}

declare namespace OpenApiEnforcerMiddleware {

    export interface MiddlewareFunction {
        (req: object, res: object, next: NextFunction): void;
        (err: Error, req: object, res: object, next: NextFunction): void;
    }

    export interface NextFunction {
        (err?: Error): void;
    }

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
