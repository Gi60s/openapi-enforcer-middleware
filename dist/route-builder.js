"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeBuilder = void 0;
const debug_1 = __importDefault(require("debug"));
const events_1 = require("./events");
const error_code_1 = __importDefault(require("./error-code"));
const init_1 = require("./init");
const util2_1 = require("./util2");
const debug = debug_1.default('openapi-enforcer-middleware:router');
const methods = ['get', 'post', 'put', 'delete', 'head', 'trace', 'options', 'connect', 'patch'];
const { validatorNonEmptyString } = util2_1.optionValidators;
function routeBuilder(openapi, controllers, options) {
    const operationsMap = new WeakMap();
    if (typeof controllers !== 'object' || controllers === null) {
        throw Error('Expected controllers to be a non-null object. Received: ' + controllers);
    }
    const opts = util2_1.normalizeOptions(options, {
        defaults: {
            xController: 'x-controller',
            xOperation: 'x-operation'
        },
        required: [],
        validators: {
            xController: validatorNonEmptyString,
            xOperation: validatorNonEmptyString
        }
    });
    debug('Initialized with options: ' + JSON.stringify(opts, null, 2));
    Object.keys(openapi.paths)
        .forEach(path => {
        Object.keys(openapi.paths[path])
            .filter(key => methods.includes(key.toLowerCase()))
            .forEach(method => {
            const operation = openapi.paths[path][method];
            operationsMap.set(operation, noop);
            const controllerKey = getControllerValue(operation, opts.xController) || '';
            const operationKey = operation.operationId || operation[opts.xOperation] || '';
            if (!controllerKey) {
                events_1.emit('warning', new error_code_1.default('Operation at "' + method + ' ' + path + '" not mapped because no ' + opts.xController + ' has been defined.', 'ENFORCER_MIDDLEWARE_ROUTE_NO_MAPPING'));
            }
            else if (!operationKey) {
                events_1.emit('warning', new error_code_1.default('Operation at "' + method + ' ' + path + '" not mapped because no ' + opts.xOperation + ' (not operationId) has been defined.', 'ENFORCER_MIDDLEWARE_ROUTE_NO_MAPPING'));
            }
            else if (controllers[controllerKey] === undefined) {
                events_1.emit('error', new error_code_1.default('Controller not defined: ' + controllerKey, 'ENFORCER_MIDDLEWARE_ROUTE_CONTROLLER'));
            }
            else if (controllers[controllerKey][operationKey] === undefined) {
                events_1.emit('error', new error_code_1.default('Controller at ' + path + ' missing operation: ' + operationKey, 'ENFORCER_MIDDLEWARE_ROUTE_NO_OP'));
            }
            else {
                operationsMap.set(operation, controllers[controllerKey][operationKey]);
            }
        });
    });
    return function (req, res, next) {
        const { initialized, basePathMatch } = init_1.getInitStatus(req);
        if (!basePathMatch) {
            debug('Base path does not match registered base path');
            next();
        }
        else if (initialized) {
            debug('Base path matches registered base path and is initialized');
            const { operation } = req.enforcer;
            const handler = operationsMap.get(operation);
            try {
                const result = handler(req, res, next);
                if (result instanceof Promise || result.then === 'function' && result.catch === 'function') {
                    result.catch(next);
                }
            }
            catch (err) {
                next(err);
            }
        }
        else {
            debug('Not initialized');
            events_1.emit('error', new error_code_1.default('OpenAPI Enforcer Middleware not initialized. Could not map OpenAPI operations to routes.', 'ENFORCER_MIDDLEWARE_NOT_INITIALIZED'));
            next();
        }
    };
}
exports.routeBuilder = routeBuilder;
function getControllerValue(operation, xController) {
    let node = operation;
    while (node) {
        if (xController in node) {
            debug('Controller key ' + xController + ' found: ' + node[xController]);
            return node[xController];
        }
        node = node.enforcerData && node.enforcerData.parent ? node.enforcerData.parent.result : null;
    }
    debug('Controller key ' + xController + ' not found');
}
function noop(_req, _res, next) {
    next();
}
//# sourceMappingURL=route-builder.js.map