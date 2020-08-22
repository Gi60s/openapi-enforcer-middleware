import Express from 'express'
import { IncomingHttpHeaders } from "http";

export interface ControllerOptions {
    dependencies: Array<any>
    ignoreMissingControllers?: boolean
    ignoreMissingOperations?: boolean
}

export type ErrorMiddleware = (err: Error, req: Express.Request, res: Express.Response, next: Express.NextFunction) => void

export namespace IEnforcer {
    export interface RequestInput {
        body?: string | { [key: string]: any }
        headers: IncomingHttpHeaders
        method: string
        path: string
    }

    export interface RequestResult {
        body?: any
        cookie: { [key: string]: any }
        headers: { [key: string]: any }
        operation: any
        path: { [key: string]: any }
        query: { [key: string]: any }
        response: any
    }
}

export type Middleware = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => void

export interface MiddlewareRequestData {
    body?: any
    cookies: { [key: string]: any }
    headers: { [key: string]: any }
    openapi: any
    operation: any
    options: MiddlewareOptions
    params: { [key: string]: any }
    query: { [key: string]: any }
    response: any
}

export interface MiddlewareResponseData {
    send (body: any): void
}

export interface MockMode {
    name?: string
    origin: string
    source: string
    specified: boolean
    statusCode: string
}

export interface MiddlewareOptions {
    allowOtherQueryParameters?: boolean | string[]
    handleBadRequest?: boolean
    handleBadResponse?: boolean
    handleNotFound?: boolean
    handleMethodNotAllowed?: boolean
    mockHeader?: string
    mockQuery?: string
    reqProperty?: string
    resSerialize?: boolean
    resValidate?: boolean
    xController?: string
    xOperation?: string
}

export interface StatusError extends Error {
    exception?: any
    statusCode?: number
}

