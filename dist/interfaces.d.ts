/// <reference types="node" />
import Express from 'express';
import { IncomingHttpHeaders } from "http";
interface AnyObject {
    [key: string]: any;
}
export interface RouteBuilderOptions {
    dependencies?: Array<any>;
    ignoreMissingControllers?: boolean;
    ignoreMissingOperations?: boolean;
    lazyLoad?: boolean;
    xController?: string;
    xOperation?: string;
}
export declare type ErrorMiddleware = (err: Error, req: Express.Request, res: Express.Response, next: Express.NextFunction) => void;
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
        next(): IteratorResult<string[] | void, any>;
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
    mockStore?: MockStore;
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
    send(body: any): void;
}
export interface MockMode {
    name?: string;
    origin: 'fallback' | 'query' | 'header';
    source: 'implemented' | 'example' | 'random' | '';
    specified: boolean;
    statusCode: string;
}
export interface MockStore {
    getData(req: Express.Request, res: Express.Response): Promise<AnyObject>;
    setData(req: Express.Request, res: Express.Response, data: AnyObject): Promise<void>;
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
export {};
