import Debug from 'debug'
// @ts-ignore
import Enforcer from 'openapi-enforcer'
import Express from 'express'
import * as I from './interfaces'
import { handleRequestError, normalizeOptions, optionValidators, reqHasBody, sender } from "./util2"
import { getMockMode, mockHandler } from "./mock";
import cookieStore from "./cookie-store";

const { validatorBoolean, validatorString, validatorNonEmptyString, validatorQueryParams } = optionValidators
const activeRequestMap: WeakMap<Express.Request, string> = new WeakMap()
const debug = Debug('openapi-enforcer-middleware:init')

export function getInitStatus (req: Express.Request): { initialized: boolean, basePathMatch: boolean } {
    const path = activeRequestMap.get(req)
    debug('Comparing initialized base URL ' + path + ' to original URL ' + req.originalUrl)
    return {
        initialized: path !== undefined,
        basePathMatch: req.originalUrl.startsWith(path || '')
    }
}

export function init (openapi: any, options?: I.MiddlewareOptions): I.Middleware {
    const opts: I.MiddlewareOptions = normalizeOptions(options, {
        defaults: {
            allowMockNoResponseSchema: true,
            allowOtherQueryParameters: false,
            baseUrl: null,
            handleBadRequest: true,
            handleBadResponse: true,
            handleNotFound: true,
            handleMethodNotAllowed: true,
            ignoreRequestErrors: true,
            mockHeader: 'x-mock',
            mockQuery: 'x-mock',
            mockStore: cookieStore(),
            xMockImplemented: 'x-mock-implemented'
        },
        required: [],
        validators: {
            allowMockNoResponseSchema: validatorBoolean,
            allowOtherQueryParameters: validatorQueryParams,
            baseUrl: v => typeof v !== 'string' && v !== null ? 'Expected a string or null' : '',
            handleBadRequest: validatorBoolean,
            handleBadResponse: validatorBoolean,
            handleNotFound: validatorBoolean,
            handleMethodNotAllowed: validatorBoolean,
            ignoreRequestErrors: validatorBoolean,
            mockHeader: validatorString,
            mockQuery: validatorString,
            mockStore: (v: any) => {
                const message = 'Expected an object with the properties get and set as functions.'
                if (!v || typeof v !== 'object') return message
                if (typeof v.get !== 'function') return message
                if (typeof v.set !== 'function') return message
                return ''
            },
            xMockImplemented: validatorNonEmptyString
        }
    })!
    debug('Initialized with options: ' + JSON.stringify(opts, null, 2))

    return function (req: Express.Request, res: Express.Response, next: Express.NextFunction) {
        Promise.resolve(openapi)
            .then(openapi => {
                const baseUrl = typeof opts.baseUrl === 'string' ? opts.baseUrl : req.baseUrl
                debug('Register request base URL: ' + baseUrl)
                activeRequestMap.set(req, baseUrl)

                // convert express request into OpenAPI Enforcer request
                const relativePath = ('/' + req.originalUrl.substring(baseUrl.length)).replace(/^\/{2}/, '/')
                const hasBody = reqHasBody(req)
                const requestObj: I.IEnforcer.RequestInput = {
                    headers: req.headers,
                    method: req.method,
                    path: relativePath // takes in and processes query parameters here
                }
                if (hasBody) requestObj.body = req.body
                if (opts.allowOtherQueryParameters === false) opts.allowOtherQueryParameters = []
                if (opts.allowOtherQueryParameters !== true && opts.mockQuery) opts.allowOtherQueryParameters!.push(opts.mockQuery)
                const [ request, error ] = openapi.request(requestObj, { allowOtherQueryParameters: opts.allowOtherQueryParameters })

                // merge unvalidated and unserialized values into validated and serialized objects
                if (request) {
                    if (req.cookies) mergeNewProperties(req.cookies, request.cookie)
                    mergeNewProperties(req.headers, request.headers)
                    mergeNewProperties(req.query, request.query)
                }

                if (error) {
                    // probably a client error
                    handleRequestError(opts, error, req, res, next)
                    debug('Request failed validation', error)

                } else {
                    // request match found
                    debug('Request valid')
                    const { body, cookie, headers, operation, path, query, response } = request

                    // make deserialized request values accessible along with openapi, operation, and a response function
                    req.enforcer = {
                        accepts (responseCode: number | string): { next (): IteratorResult<string[] | void, any>, [Symbol.iterator] (): any } {
                            return operation.getResponseContentTypeMatches(responseCode, headers.accept || '*/*')
                        },
                        cookies: cookie,
                        headers,
                        openapi,
                        operation,
                        options: opts,
                        params: path,
                        response,
                        query
                    }
                    if (hasBody) req.enforcer.body = body

                    // make response data object
                    res.enforcer = {
                        send: sender(opts, req, res, next),
                        status (code: number) {
                            res.status(code)
                            return this
                        }
                    }

                    const mockMode = getMockMode(req)
                    if (mockMode) {
                        const mockStore = opts.mockStore!
                        debug('Request is for mocked data')

                        // store mock data
                        req.enforcer.mockMode = mockMode
                        req.enforcer.mockStore = {
                            get (key: string): Promise<any> {
                                return mockStore.get(req, res, key)
                            },
                            set (key: string, value: any): Promise<void> {
                                return mockStore.set(req, res, key, value)
                            }
                        }

                        // if operation identifies as having operable mock code to execute then don't run auto mock response handler
                        if (hasImplementedMock(opts.xMockImplemented!, operation) && (mockMode.source === 'implemented' || mockMode.source === '')) {
                            debug('Request has implemented mock')
                            next()
                        } else {
                            debug('Request being auto mocked')
                            mockHandler(req, res, next, mockMode)
                        }
                    } else {
                        next()
                    }
                }
            })
            .catch(next)
    }
}

function mergeNewProperties (src: { [key: string]: any }, dest: { [key: string]: any }) {
    Object.keys(src).forEach(key => {
        if (!dest.hasOwnProperty(key)) dest[key] = src[key]
    })
}

function hasImplementedMock (mockKey: string, operation: any): boolean {
    if (mockKey in operation) return !!operation[mockKey]

    let data = operation.enforcerData
    while (data) {
        data = data.parent
        if (data && mockKey in data.result) return !!data.result[mockKey]
    }

    return false
}
