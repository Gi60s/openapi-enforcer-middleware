// @ts-ignore
import Enforcer from 'openapi-enforcer'
import Express from 'express'
import * as I from './interfaces'
import { handleRequestError, normalizeOptions, optionValidators, reqHasBody, sender } from "./util2"
import {getMockMode, mockHandler} from "./mock";

const { validatorBoolean, validatorNonEmptyString, validatorQueryParams } = optionValidators

export function routeEnforcer (enforcerPromise: Promise<Enforcer>, options?: I.MiddlewareOptions): I.Middleware {
    const opts: I.MiddlewareOptions = normalizeOptions(options, {
        defaults: {
            allowOtherQueryParameters: false,
            handleBadRequest: true,
            handleBadResponse: true,
            handleNotFound: true,
            handleMethodNotAllowed: true,
            mockHeader: 'x-mock',
            mockQuery: 'x-mock',
            resSerialize: true,
            resValidate: true,
            xController: 'x-controller',
            xOperation: 'x-operation'
        },
        required: [],
        validators: {
            allowOtherQueryParameters: validatorQueryParams,
            handleBadRequest: validatorBoolean,
            handleBadResponse: validatorBoolean,
            handleNotFound: validatorBoolean,
            handleMethodNotAllowed: validatorBoolean,
            mockHeader: validatorNonEmptyString,
            mockQuery: validatorNonEmptyString,
            resSerialize: validatorBoolean,
            resValidate: validatorBoolean,
            xController: validatorNonEmptyString,
            xOperation: validatorNonEmptyString
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
                        mockHandler(req, res, next, mockMode)
                    } else {
                        next()
                    }
                }
            })
            .catch(next)
    }
}