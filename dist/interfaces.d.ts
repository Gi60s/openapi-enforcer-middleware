/// <reference types="node" />
import Express from 'express';
import { IncomingHttpHeaders } from "http";
declare global {
    namespace Express {
        interface Request {
            enforcer?: MiddlewareRequestData;
        }
        interface Response {
            enforcer?: MiddlewareResponseData;
        }
    }
}
export interface RouteBuilderOptions {
    commonDependencyKey: string;
    lazyLoad?: boolean;
    xController?: string;
    xOperation?: string;
}
export declare namespace IEnforcer {
    interface RequestInput {
        body?: string | {
            [key: string]: any;
        };
        headers: IncomingHttpHeaders;
        method: string;
        path: string;
    }
    interface RequestResult {
        body?: any;
        cookie: {
            [key: string]: any;
        };
        headers: {
            [key: string]: any;
        };
        operation: any;
        path: {
            [key: string]: any;
        };
        query: {
            [key: string]: any;
        };
        response: any;
    }
}
export declare type Middleware = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => void;
export interface MiddlewareRequestData {
    accepts(responseCode: number | string): {
        next(): IteratorResult<string[] | void>;
        [Symbol.iterator](): any;
    };
    body?: any;
    cookies: {
        [key: string]: any;
    };
    headers: {
        [key: string]: any;
    };
    mockMode?: MockMode;
    mockStore?: {
        get(key: string): Promise<any>;
        set(key: string, value: any): Promise<any>;
    };
    openapi: any;
    operation: any;
    options: MiddlewareOptions;
    params: {
        [key: string]: any;
    };
    query: {
        [key: string]: any;
    };
    response: any;
}
export interface MiddlewareResponseData {
    send(body?: any): void;
    status(code: number): MiddlewareResponseData;
}
export interface MockMode {
    name?: string;
    origin: 'fallback' | 'query' | 'header';
    source: 'implemented' | 'example' | 'random' | '';
    specified: boolean;
    statusCode: string;
}
export interface MockStore {
    get(req: Express.Request, res: Express.Response, key: string): Promise<any>;
    set(req: Express.Request, res: Express.Response, key: string, value: any): Promise<any>;
}
export interface MiddlewareOptions {
    allowOtherQueryParameters?: boolean | string[];
    handleBadRequest?: boolean;
    handleBadResponse?: boolean;
    handleNotFound?: boolean;
    handleMethodNotAllowed?: boolean;
    mockHeader?: string;
    mockQuery?: string;
    mockStore?: MockStore;
    xMockImplemented?: string;
}
export interface StatusError extends Error {
    exception?: any;
    statusCode?: number;
}
