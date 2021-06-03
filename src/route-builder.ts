import Debug from 'debug'
import { emit } from './events'
import ErrorCode from './error-code'
import Express from 'express'
import { getInitStatus } from './init'
import { normalizeOptions, optionValidators } from "./util2"
import * as I from "./interfaces"

const debug = Debug('openapi-enforcer-middleware:router')
const methods = ['get', 'post', 'put', 'delete', 'head', 'trace', 'options', 'connect', 'patch']
const { validatorNonEmptyString } = optionValidators

export type Controllers = Record<string, ControllersMap>
export type ControllersMap = Record<string, Route>
export type Route = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => any

export function routeBuilder (openapi: any, controllers: Controllers, options?: I.RouteBuilderOptions) {
    const operationsMap = new WeakMap<any, Route>()

    if (typeof controllers !== 'object' || controllers === null) {
        throw Error('Expected controllers to be a non-null object. Received: ' + controllers)
    }

    const opts = normalizeOptions(options, {
        defaults: {
            xController: 'x-controller',
            xOperation: 'x-operation'
        },
        required: [],
        validators: {
            xController: validatorNonEmptyString,
            xOperation: validatorNonEmptyString
        }
    })!
    debug('Initialized with options: ' + JSON.stringify(opts, null, 2))

    // build all operations
    Object.keys(openapi.paths)
        .forEach(path => {
            Object.keys(openapi.paths[path])
                .filter(key => methods.includes(key.toLowerCase()))
                .forEach(method => {
                    const operation = openapi.paths[path][method]
                    operationsMap.set(operation, noop)

                    // get the controller id and operation id
                    const controllerKey = getControllerValue(operation, opts.xController!) || ''
                    const operationKey = operation.operationId || operation[opts.xOperation!] || ''

                    // verify that the controller id and operation id have been defined for this operation
                    if (!controllerKey) {
                        emit('warning', new ErrorCode('Operation at "' + method + ' ' + path + '" not mapped because no ' + opts.xController + ' has been defined.', 'ENFORCER_MIDDLEWARE_ROUTE_NO_MAPPING'))
                    } else if (!operationKey) {
                        emit('warning', new ErrorCode('Operation at "' + method + ' ' + path + '" not mapped because no ' + opts.xOperation + ' (not operationId) has been defined.', 'ENFORCER_MIDDLEWARE_ROUTE_NO_MAPPING'))
                    } else if (controllers[controllerKey] === undefined) {
                        emit('error', new ErrorCode('Controller not defined: ' + controllerKey, 'ENFORCER_MIDDLEWARE_ROUTE_CONTROLLER'))
                        // @ts-ignore
                    } else if (controllers[controllerKey][operationKey] === undefined) {
                        emit('error', new ErrorCode('Controller at ' + path + ' missing operation: ' + operationKey, 'ENFORCER_MIDDLEWARE_ROUTE_NO_OP'))
                    } else {
                        // @ts-ignore
                        operationsMap.set(operation, controllers[controllerKey][operationKey])
                    }
                })
        })

    // return the express middleware
    return function (req: Express.Request, res: Express.Response, next: Express.NextFunction) {
        const { initialized, basePathMatch } = getInitStatus(req)
        if (!basePathMatch) {
            debug('Base path does not match registered base path')
            next()
        } else if (initialized) {
            debug('Base path matches registered base path and is initialized')
            const { operation } = req.enforcer!

            // load the operation handler
            const handler = operationsMap.get(operation)!
            try {
                const result = handler(req, res, next)
                if (result instanceof Promise || result.then === 'function' && result.catch === 'function') {
                    result.catch(next)
                }
            } catch(err) {
                next(err)
            }
        } else {
            debug('Not initialized')
            emit('error', new ErrorCode('OpenAPI Enforcer Middleware not initialized. Could not map OpenAPI operations to routes.', 'ENFORCER_MIDDLEWARE_NOT_INITIALIZED'))
            next()
        }
    }
}

function getControllerValue (operation: any, xController: string): string | void {
    let node = operation
    while (node) {
        if (xController in node) {
            debug('Controller key ' + xController + ' found: ' + node[xController])
            return node[xController]
        }
        node = node.enforcerData && node.enforcerData.parent ? node.enforcerData.parent.result : null
    }
    debug('Controller key ' + xController + ' not found')
}

function noop (_req: Express.Request, _res: Express.Response, next: Express.NextFunction) {
    next()
}
