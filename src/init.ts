// @ts-ignore
import Enforcer from 'openapi-enforcer'
import Express from 'express'
import * as I from './interfaces'
import { handleRequestError, normalizeOptions, optionValidators, reqHasBody, sender } from "./util2"
import { getMockMode, mockHandler } from "./mock";
import cookieStore from "./cookie-store";
import { emit } from './events'
import ErrorCode from './error-code'

const { validatorBoolean, validatorString, validatorNonEmptyString, validatorQueryParams } = optionValidators

export function init (enforcerPromise: Promise<any>, options?: I.MiddlewareOptions): I.Middleware {
    const opts: I.MiddlewareOptions = normalizeOptions(options, {
        defaults: {
            allowOtherQueryParameters: false,
            handleBadRequest: true,
            handleBadResponse: true,
            handleNotFound: true,
            handleMethodNotAllowed: true,
            mockHeader: 'x-mock',
            mockQuery: 'x-mock',
            mockStore: cookieStore(),
            xMockImplemented: 'x-mock-implemented'
        },
        required: [],
        validators: {
            allowOtherQueryParameters: validatorQueryParams,
            handleBadRequest: validatorBoolean,
            handleBadResponse: validatorBoolean,
            handleNotFound: validatorBoolean,
            handleMethodNotAllowed: validatorBoolean,
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

    enforcerPromise.catch((err: ErrorCode) => {
        if (!err.code) err.code = 'ENFORCER_MIDDLEWARE_LOAD_ERROR'
        emit('error', err)
    })

    return function (req: Express.Request, res: Express.Response, next: Express.NextFunction) {
        enforcerPromise
            .then(openapi => {
                // convert express request into OpenAPI Enforcer request
                const relativePath = ('/' + req.originalUrl.substring(req.baseUrl.length)).replace(/^\/{2}/, '/')
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
                    handleRequestError(opts, error, res, next)

                } else {
                    // request match found
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
                        send: sender(opts, req, res, next)
                    }

                    const mockMode = getMockMode(req)
                    if (mockMode) {
                        const mockStore = opts.mockStore!

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
                            next()
                        } else {
                            mockHandler(req, res, next, mockMode)
                        }
                    } else {
                        next()
                    }
                }
            })
            .catch(err => {
                next(err)
            })
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