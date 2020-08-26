// @ts-ignore
import Enforcer from 'openapi-enforcer'
import Express from 'express'
import * as I from './interfaces'
import { handleRequestError, normalizeOptions, optionValidators, reqHasBody, sender } from "./util2"
import { getMockMode, mockHandler } from "./mock";
import cookieStore from "./cookie-store";

const { validatorBoolean, validatorString, validatorNonEmptyString, validatorQueryParams } = optionValidators

export function init (enforcerPromise: Promise<Enforcer>, options?: I.MiddlewareOptions): I.Middleware {
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
            xController: 'x-controller',
            xOperation: 'x-operation',
            xMockSessions: 'x-mock-sessions'
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
            mockStore: (v: any) => typeof v === 'function' ? '' : 'Expected a function',
            xController: validatorNonEmptyString,
            xOperation: validatorNonEmptyString,
            xMockSessions: validatorNonEmptyString
        }
    })!

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

                if (error) {
                    // probably a client error
                    handleRequestError(opts, error, res, next)

                } else {
                    // request match found
                    const { body, cookie, headers, operation, path, query, response } = request

                    // make deserialized request values accessible along with openapi, operation, and a response function
                    req.enforcer = {
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
                        // store mock data
                        req.enforcer.mockMode = mockMode
                        req.enforcer.mockStore = opts.mockStore

                        // if operation identifies as having operable mock code to execute then don't run auto mock response handler
                        if (!operation[opts.xMockSessions]) {
                            mockHandler(req, res, next, mockMode)
                        } else {
                            next()
                        }
                    } else {
                        next()
                    }
                }
            })
            .catch(next)
    }
}