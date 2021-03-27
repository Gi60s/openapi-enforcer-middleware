import { emit } from './events'
import ErrorCode from './error-code'
import Express from 'express'
import path from 'path'
import { getInitStatus } from './init'
import { normalizeOptions, optionValidators } from "./util2"
import * as I from "./interfaces";

const { validatorBoolean, validatorNonEmptyString } = optionValidators
const methods = { get: true, post: true, put: true, delete: true, head: true, trace: true, options: true, connect: true, patch: true }

interface ControllerData {
    controller: any
    hasError: boolean
    promise: Promise<any>
}

// type ControllerFunction = (...args: unknown[]) => object

export type ControllerReference = any

export type IDependencies = Array<any> | DependencyMap

export interface DependencyMap {
    [key: string]: Array<any>
}

interface OperationData {
    controllerKey: string
    operationKey: string
    operationHandler: Function | null
    path: string
}

interface GetOperationConfig {
    commonDependencyKey: string
    controllersInput: Record<string, Promise<any>> | null
    controllersMap: Map<string, ControllerData>
    dependencies: IDependencies
    dirPath: string
    operation: any
    operationsMap: WeakMap<any, OperationData>
    xController: string
    xOperation: string
}

export function routeBuilder (enforcerPromise: Promise<any>, controllers: string | Record<string, ControllerReference>, dependencies?: IDependencies, options?: I.RouteBuilderOptions) {
    const controllersMap: Map<string, ControllerData> = new Map()
    const operationsMap: WeakMap<any, OperationData> = new WeakMap()
    const controllersInput: Record<string, ControllerReference> | null = typeof controllers !== 'string' ? controllers : null
    const dirPath: string = typeof controllers === 'string' ? controllers : ''

    // normalize dependencies
    if (!dependencies) {
        dependencies = []
    } else {
        const message = 'Expected an array of values or an object map with property values as arrays of values.'
        const isArray = Array.isArray(dependencies)
        const isObject = dependencies && typeof dependencies === 'object'
        if (!isObject && !isArray) throw Error(message)
        if (isObject && !isArray) {
            const map: DependencyMap = <DependencyMap>dependencies
            const keys = Object.keys(map)
            const length = keys.length
            for (let i = 0; i < length; i++) {
                if (!Array.isArray(map[keys[i]])) throw Error(message)
            }
        }
    }

    const opts = normalizeOptions(options, {
        defaults: {
            commonDependencyKey: 'common',
            lazyLoad: false,
            xController: 'x-controller',
            xOperation: 'x-operation'
        },
        required: [],
        validators: {
            dependencies: (v: any) => {
                if (Array.isArray(v)) return ''

                const message = 'Expected an array of values or an object map with property values as arrays of values.'
                if (v && typeof v === 'object') {
                    const keys = Object.keys(v)
                    const length = keys.length
                    for (let i = 0; i < length; i++) {
                        if (!Array.isArray(v[keys[i]])) return message
                    }
                    return ''
                }

                return message
            },
            lazyLoad: validatorBoolean,
            xController: validatorNonEmptyString,
            xOperation: validatorNonEmptyString
        }
    })!

    // if we are not lazy loading the load all operations now
    if (!opts.lazyLoad) {
        enforcerPromise.then(openapi => {
            if (openapi.paths) {
                Object.keys(openapi.paths).forEach(path => {
                    Object.keys(openapi.paths[path]).forEach(opKey => {
                        opKey = opKey.toLowerCase()
                        // @ts-ignore
                        if (methods[opKey]) {
                            const config: GetOperationConfig = {
                                commonDependencyKey: opts.commonDependencyKey,
                                controllersInput,
                                controllersMap,
                                dependencies: dependencies!,
                                dirPath,
                                operation: openapi.paths[path][opKey],
                                operationsMap,
                                xController: opts.xController!,
                                xOperation: opts.xOperation!
                            }
                            getOperation(config).catch(err => {
                                if (err.code !== 'MODULE_NOT_FOUND') {
                                    emit('error', err)
                                }
                            })
                        }
                    })
                })
            }
        })
    }

    // return the express middleware
    return function (req: Express.Request, res: Express.Response, next: Express.NextFunction) {
        const { initialized, basePathMatch } = getInitStatus(req)
        if (!basePathMatch) {
            next()
        } else if (initialized) {
            const { operation } = req.enforcer!
            const config: GetOperationConfig = {
                commonDependencyKey: opts.commonDependencyKey,
                controllersInput,
                controllersMap,
                dependencies: dependencies!,
                dirPath,
                operation,
                operationsMap,
                xController: opts.xController!,
                xOperation: opts.xOperation!
            }
            getOperation(config)
                .then(async (fnOperation: Function) => {
                    await fnOperation(req, res, next)
                })
                .catch(next)
        } else {
            emit('error', new ErrorCode('OpenAPI Enforcer Middleware not initialized. Could not map OpenAPI operations to routes.', 'ENFORCER_MIDDLEWARE_NOT_INITIALIZED'))
            next()
        }
    }
}

function getControllerValue (operation: any, xController: string): string | void {
    let node = operation
    while (node) {
        if (xController in node) return node[xController]
        node = node.enforcerData && node.enforcerData.parent ? node.enforcerData.parent.result : null
    }
}

async function getOperation (opts: GetOperationConfig): Promise<Function> {
    const { commonDependencyKey, controllersInput, controllersMap, dirPath, operation, operationsMap, xController, xOperation } = opts

    // load the controller
    let data = operationsMap.get(operation)
    if (!data) {
        const controllerKey = getControllerValue(operation, xController) || ''
        const operationKey = operation.operationId || operation[xOperation] || ''
        const controllerPath = controllerKey ? path.resolve(dirPath, controllerKey) : ''
        data = {
            controllerKey,
            operationKey,
            operationHandler: null,
            path: controllerPath
        }
        operationsMap.set(operation, data)
    }

    // if the operation handler has already been determined then return it
    if (data.operationHandler) return data.operationHandler

    // if the operation does not define a controller or an operation then we assume it shouldn't map to a controller
    const opPath = operation.enforcerData.parent && operation.enforcerData.parent.key
    const opMethod = operation.enforcerData.key
    if (!data.controllerKey) {
        if (!data.operationKey) {
            emit('warning', new ErrorCode('Operation at "' + opMethod.toUpperCase() + ' ' + opPath + '" not mapped because no ' + xController + ' and no ' + xOperation + ' (nor operationId) has been defined.', 'ENFORCER_MIDDLEWARE_ROUTE_NO_MAPPING'))
        } else {
            emit('warning', new ErrorCode('Operation at "' + opMethod.toUpperCase() + ' ' + opPath + '" not mapped because no ' + xController + ' has been defined.', 'ENFORCER_MIDDLEWARE_ROUTE_NO_MAPPING'))
        }
        return data.operationHandler = noop
    } else if (!data.operationKey) {
        emit('warning', new ErrorCode('Operation at "' + opMethod.toUpperCase() + ' ' + opPath + '" not mapped because no ' + xOperation + ' (nor operationId) has been defined.', 'ENFORCER_MIDDLEWARE_ROUTE_NO_MAPPING'))
        return data.operationHandler = noop
    }

    // get controller specific dependencies
    const controllerKey = data.controllerKey
    const dependencies = opts.dependencies
    let specificDeps: any[]
    if (Array.isArray(dependencies)) {
        specificDeps = dependencies
    } else {
        specificDeps = []
        if (dependencies[controllerKey]) specificDeps.push(...dependencies[controllerKey])
        if (dependencies[commonDependencyKey]) specificDeps.push(...dependencies[commonDependencyKey])
    }

    let controller: any
    if (controllersInput && controllerKey in controllersInput) {
        const directive = controllersInput[controllerKey]
        if (typeof directive === 'function') {
            controller = directive
        } else if (directive instanceof Promise) {
            const loaded = await directive
            controller = loaded.default(...specificDeps)
        }
    } else {
        controller = await importController(controllersMap, data.path, specificDeps)
    }
    if (!controller) return data.operationHandler = noop

    // check if the operation is defined in the controller
    const op: Function = controller[data.operationKey]
    if (!op) {
        emit('error', new ErrorCode('Controller at ' + data.path + ' missing operation: ' + data.operationKey, 'ENFORCER_MIDDLEWARE_ROUTE_NO_OP'))
        return data.operationHandler = noop
    } else {
        return data.operationHandler = op
    }
}

async function importController (controllersMap: Map<string, ControllerData>, filePath: string, dependencies: any[]) {
    let data = controllersMap.get(filePath)
    if (!data) {
        data = {
            controller: null,
            hasError: false,
            promise: Promise.resolve()
        }
        controllersMap.set(filePath, data)

        // attempt to load the controller file
        let factory: any
        try {
            data.promise = import(filePath)
            factory = await data.promise
        } catch (err) {
            if (err.code === 'MODULE_NOT_FOUND') {
                emit('error', new ErrorCode('Controller file not found: ' + filePath, 'ENFORCER_MIDDLEWARE_ROUTE_CONTROLLER'))
            } else {
                emit('error', err)
            }
            return data.controller = null
        }

        // if the controller file loaded then make sure it exported a function
        if (typeof factory !== 'function' && typeof factory.default === 'function') factory = factory.default
        if (typeof factory !== 'function') {
            emit('error', new ErrorCode('Controller file must export a function: ' + filePath + '. If using ES imports export the function as default.', 'ENFORCER_MIDDLEWARE_ROUTE_FACTORY'))
            return data.controller = null
        }

        // call the controller factory with dependencies injected to get back the controller
        try {
            data.controller = factory(...dependencies)
            return data.controller
        } catch (err) {
            emit('error', err)
            return data.controller = null
        }
    } else {
        await data.promise
        return data.controller
    }
}

function noop (_req: Express.Request, _res: Express.Response, next: Express.NextFunction) {
    next()
}