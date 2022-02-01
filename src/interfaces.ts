import Express from 'express'
import { IncomingHttpHeaders } from "http";

declare global {
    namespace Express {
        export interface Request {
            clientError?: StatusError
            enforcer?: MiddlewareRequestData
        }

        export interface Response {
            enforcer?: MiddlewareResponseData
        }
    }
}

export interface RouteBuilderOptions {
    xController?: string                    // the name of the OpenAPI extension property that will define the API controller file
    xOperation?: string                     // the name of the OpenAPI extension property that will define the operation name within the controller file
}

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
    accepts (responseCode: number | string): { next (): IteratorResult<string[] | void>, [Symbol.iterator] (): any }
    body?: any
    cookies: { [key: string]: any }
    headers: { [key: string]: any }
    mockMode?: MockMode                 // this property will only be set if a mock response should be sent
    mockStore?: {                       // this property will only be set if a mock response should be sent
        get (key: string): Promise<any>
        set (key: string, value: any): Promise<any>
    }
    openapi: any
    operation: any
    options: MiddlewareOptions
    params: { [key: string]: any }
    query: { [key: string]: any }
    response: any
}

export interface MiddlewareResponseData {
    send (body?: any): void
    status (code: number): MiddlewareResponseData
}

export interface MockMode {
    name?: string                                       // example name to use (OpenAPI v3 only)
    origin: 'fallback' | 'query' | 'header'             // where the mock request originate from
    source: 'implemented' | 'example' | 'random' | ''   // where to generate the response from
    specified: boolean                                  // whether a mock request was specified
    statusCode: string                                  // the response status code to mock for
}

export interface MockStore {
    get (req: Express.Request, res: Express.Response, key: string): Promise<any>
    set (req: Express.Request, res: Express.Response, key: string, value: any): Promise<any>
}

export interface MiddlewareOptions {
    allowMockNoResponseSchema?: boolean             // if true and there is no response schema then an empty response is sent back, if false then a 422 response is sent back
    allowOtherQueryParameters?: boolean | string[]
    baseUrl?: string                                // the base URL to use for the enforcer router
    handleBadRequest?: boolean                      // if true, a 400 response is sent back automatically, if false the `enforcer` property is not set on the req and res objects.
    handleBadResponse?: boolean                     // if true, a 500 response is sent back automatically, if false the next middleware is called with the error
    handleNotFound?: boolean                        // if true, a 404 response is sent back automatically, if false the `enforcer` property is not set on the req and res objects.
    handleMethodNotAllowed?: boolean                // if true, a 405 response is sent back automatically, if false the `enforcer` property is not set on the req and res objects.
    ignoreRequestErrors?: boolean                   // if true, next middleware called without an error
    mockHeader?: string                             // if true then manual mocking via header is enabled
    mockQuery?: string                              // if true then manual mocking via query is enabled
    mockStore?: MockStore                           // this mock store to use if the request is a mock request
    xMockImplemented?: string                       // the name of the OpenAPI extension property that identifies if the operation has a mock response implemented in your code
}

export interface StatusError extends Error {
    exception?: any
    statusCode?: number
}

