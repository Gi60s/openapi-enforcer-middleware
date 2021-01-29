"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeBuilder = void 0;
const events_1 = require("./events");
const error_code_1 = __importDefault(require("./error-code"));
const path_1 = __importDefault(require("path"));
const init_1 = require("./init");
const util2_1 = require("./util2");
const { validatorBoolean, validatorNonEmptyString } = util2_1.optionValidators;
const methods = { get: true, post: true, put: true, delete: true, head: true, trace: true, options: true, connect: true, patch: true };
function routeBuilder(enforcerPromise, dirPath, dependencies, options) {
    const controllersMap = new Map();
    const operationsMap = new WeakMap();
    if (!dependencies) {
        dependencies = [];
    }
    else {
        const message = 'Expected an array of values or an object map with property values as arrays of values.';
        const isArray = Array.isArray(dependencies);
        const isObject = dependencies && typeof dependencies === 'object';
        if (!isObject && !isArray)
            throw Error(message);
        if (isObject && !isArray) {
            const map = dependencies;
            const keys = Object.keys(map);
            const length = keys.length;
            for (let i = 0; i < length; i++) {
                if (!Array.isArray(map[keys[i]]))
                    throw Error(message);
            }
        }
    }
    const opts = util2_1.normalizeOptions(options, {
        defaults: {
            commonDependencyKey: 'common',
            lazyLoad: false,
            xController: 'x-controller',
            xOperation: 'x-operation'
        },
        required: [],
        validators: {
            dependencies: (v) => {
                if (Array.isArray(v))
                    return '';
                const message = 'Expected an array of values or an object map with property values as arrays of values.';
                if (v && typeof v === 'object') {
                    const keys = Object.keys(v);
                    const length = keys.length;
                    for (let i = 0; i < length; i++) {
                        if (!Array.isArray(v[keys[i]]))
                            return message;
                    }
                    return '';
                }
                return message;
            },
            lazyLoad: validatorBoolean,
            xController: validatorNonEmptyString,
            xOperation: validatorNonEmptyString
        }
    });
    if (!opts.lazyLoad) {
        enforcerPromise.then(openapi => {
            if (openapi.paths) {
                Object.keys(openapi.paths).forEach(path => {
                    Object.keys(openapi.paths[path]).forEach(opKey => {
                        opKey = opKey.toLowerCase();
                        if (methods[opKey]) {
                            const config = {
                                commonDependencyKey: opts.commonDependencyKey,
                                controllersMap,
                                dependencies: dependencies,
                                dirPath,
                                operation: openapi.paths[path][opKey],
                                operationsMap,
                                xController: opts.xController,
                                xOperation: opts.xOperation
                            };
                            getOperation(config).catch(err => console.error(err.stack));
                        }
                    });
                });
            }
        });
    }
    return function (req, res, next) {
        const { initialized, basePathMatch } = init_1.getInitStatus(req);
        if (!basePathMatch) {
            next();
        }
        else if (initialized) {
            const { operation } = req.enforcer;
            const config = {
                commonDependencyKey: opts.commonDependencyKey,
                controllersMap,
                dependencies: dependencies,
                dirPath,
                operation,
                operationsMap,
                xController: opts.xController,
                xOperation: opts.xOperation
            };
            getOperation(config)
                .then(async (fnOperation) => {
                await fnOperation(req, res, next);
            })
                .catch(next);
        }
        else {
            events_1.emit('error', new error_code_1.default('OpenAPI Enforcer Middleware not initialized. Could not map OpenAPI operations to routes.', 'ENFORCER_MIDDLEWARE_NOT_INITIALIZED'));
            next();
        }
    };
}
exports.routeBuilder = routeBuilder;
function getControllerValue(operation, xController) {
    let node = operation;
    while (node) {
        if (xController in node)
            return node[xController];
        node = node.enforcerData.parent.result;
    }
}
async function getOperation(opts) {
    const { commonDependencyKey, controllersMap, dirPath, operation, operationsMap, xController, xOperation } = opts;
    let data = operationsMap.get(operation);
    if (!data) {
        const controllerKey = getControllerValue(operation, xController) || '';
        const operationKey = operation.operationId || operation[xOperation];
        const controllerPath = controllerKey ? path_1.default.resolve(dirPath, controllerKey) : '';
        data = {
            controllerKey,
            operationKey,
            operationHandler: null,
            path: controllerPath
        };
        operationsMap.set(operation, data);
    }
    if (data.operationHandler)
        return data.operationHandler;
    if (!data.controllerKey && !data.operationKey) {
        return data.operationHandler = noop;
    }
    const controller = await importController(controllersMap, data.path, data.controllerKey, commonDependencyKey, opts.dependencies);
    if (!controller) {
        return data.operationHandler = noop;
    }
    const op = controller[data.operationKey];
    if (!op) {
        events_1.emit('error', new error_code_1.default('Controller at ' + data.path + ' missing operation: ' + data.operationKey, 'ENFORCER_MIDDLEWARE_ROUTE_NO_OP'));
        return data.operationHandler = noop;
    }
    else {
        return data.operationHandler = op;
    }
}
async function importController(controllersMap, filePath, controllerKey, commonDependencyKey, dependencies) {
    let data = controllersMap.get(filePath);
    if (!data) {
        data = {
            controller: null,
            hasError: false,
            promise: Promise.resolve()
        };
        controllersMap.set(filePath, data);
        let factory;
        try {
            data.promise = Promise.resolve().then(() => __importStar(require(filePath)));
            factory = await data.promise;
        }
        catch (err) {
            events_1.emit('error', err);
            return data.controller = null;
        }
        if (typeof factory !== 'function' && typeof factory.default === 'function')
            factory = factory.default;
        if (typeof factory !== 'function') {
            events_1.emit('error', new error_code_1.default('Controller file must export a function: ' + filePath + '. If using ES imports export the function as default.', 'ENFORCER_MIDDLEWARE_ROUTE_FACTORY'));
            return data.controller = null;
        }
        try {
            let specificDeps;
            if (Array.isArray(dependencies)) {
                specificDeps = dependencies;
            }
            else {
                specificDeps = [];
                if (dependencies[controllerKey])
                    specificDeps.push(...dependencies[controllerKey]);
                if (dependencies[commonDependencyKey])
                    specificDeps.push(...dependencies[commonDependencyKey]);
            }
            data.controller = factory(...specificDeps);
            return data.controller;
        }
        catch (err) {
            events_1.emit('error', err);
            return data.controller = null;
        }
    }
    else {
        await data.promise;
        return data.controller;
    }
}
function noop(_req, _res, next) {
    next();
}
//# sourceMappingURL=route-builder.js.map