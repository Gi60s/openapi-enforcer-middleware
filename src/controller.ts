import Express from 'express'
import path from 'path'
import { initialized, normalizeOptions, optionValidators } from "./util2"
import * as I from "./interfaces";

const { validatorBoolean } = optionValidators
const map: WeakMap<any, ControllerData> = new WeakMap()

interface ControllerData {
    controllerKey: string
    hasControllerError: boolean
    missingOperations: { [key: string]: true }
    operationKey: string
    path: string
    promise: Promise<Function>
}

type ControllerOperation = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => void

interface GetOperationConfig {
    dependencies: Array<any>
    dirPath: string
    ignoreMissingControllers: boolean
    ignoreMissingOperations: boolean
    operation: any
    xController: string
    xOperation: string
}

export function controller (dirPath: string, options?: I.ControllerOptions) {
    const opts: I.ControllerOptions = normalizeOptions(options, {
        defaults: {
            dependencies: [],
            ignoreMissingControllers: false,
            ignoreMissingOperations: false
        },
        required: [],
        validators: {
            dependencies: (v: any) => Array.isArray(v) ? '' : 'Expected an array of values.',
            ignoreMissingControllers: validatorBoolean,
            ignoreMissingOperations: validatorBoolean
        }
    })!

    return function (req: Express.Request, res: Express.Response, next: Express.NextFunction) {
        if (initialized(req, next)) {
            const { operation, options } = req.enforcer!
            const config: GetOperationConfig = {
                dependencies: opts.dependencies,
                dirPath,
                ignoreMissingControllers: opts.ignoreMissingControllers!,
                ignoreMissingOperations: opts.ignoreMissingOperations!,
                operation,
                xController: options.xController!,
                xOperation: options.xOperation!
            }
            getOperation(config)
                .then(async (fnOperation: ControllerOperation) => {
                    await fnOperation(req, res, next)
                })
                .catch(next)
        }
    }
}

function getControllerValue (operation: any, xController: string): string | void {
    let node = operation
    while (node) {
        if (xController in node) return node[xController]
        node = node.enforcerData.parent.result
    }
}

async function getOperation (opts: GetOperationConfig): Promise<ControllerOperation> {
    const { dirPath, operation, xController, xOperation } = opts

    // load the controller
    let data = map.get(operation)
    if (!data) {
        const controllerKey = getControllerValue(operation, xController) || ''
        const operationKey = operation.operationId || operation[xOperation]
        const controllerPath = controllerKey ? path.resolve(dirPath, controllerKey) : ''
        data = {
            controllerKey,
            hasControllerError: false,
            missingOperations: {},
            operationKey,
            path: controllerPath,
            promise: controllerKey && operationKey ? import(controllerPath) : Promise.resolve('')
        }
        map.set(operation, data)
    }

    // if the operation does not define a controller or an operation then we assume it shouldn't map to a controller
    if (!data.controllerKey && !data.operationKey) return noop

    // try to load the controller file
    let controllerFactory
    try {
        controllerFactory = await data.promise
    } catch (err) {
        if (!data.hasControllerError) {
            data.hasControllerError = true

            // TODO: check if this is a missing file error or a runtime error
            if (!opts.ignoreMissingControllers) {
                throw Error('Unable to load controller: ' + data.path)
            } else {
                return noop
            }

            throw err
        }
    }

    // controller should export a function
    if (typeof controllerFactory !== 'function') {
        if (!data.hasControllerError) {
            data.hasControllerError = true
            throw Error('Controller file must export a function')
        } else {
            return noop
        }
    }

    // call the controller factory with dependencies injected to get back the controller
    const controller = controllerFactory(...opts.dependencies)

    // check if the operation is defined in the controller
    const op: ControllerOperation = controller[data.operationKey]
    if (!op) {
        if (!data.missingOperations[data.operationKey]) {
            data.missingOperations[data.operationKey] = true
            if (!opts.ignoreMissingOperations) throw Error('Controller : ' + data.path)
        } else {
            return noop
        }
    }
    return op
}

function noop (_req: Express.Request, _res: Express.Response, next: Express.NextFunction) {
    next()
}