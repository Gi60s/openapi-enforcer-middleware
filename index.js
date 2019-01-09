/**
 *  @license
 *    Copyright 2019 Brigham Young University
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 **/
'use strict';
const Debug             = require('debug');
const Enforcer          = require('openapi-enforcer');
const mapControllers    = require('./map-controllers');

const debug = {
    controllers: Debug('openapi-enforcer-middleware:controllers'),
    mock: Debug('openapi-enforcer-middleware:mock'),
    request: Debug('openapi-enforcer-middleware:request'),
    response: Debug('openapi-enforcer-middleware:response')
};
const ENFORCER_HEADER = 'x-openapi-enforcer'

module.exports = OpenApiEnforcerMiddleware;

function OpenApiEnforcerMiddleware (definition, options) {
    if (!(this instanceof OpenApiEnforcerMiddleware)) return new OpenApiEnforcerMiddleware(definition, options);

    // validate and normalize options
    if (options !== undefined && (!options || typeof options !== 'object')) throw Error('Invalid option specified. Expected an object. Received: ' + options);
    if (!options) options = {};

    // get general settings
    const general = {
        development: options.hasOwnProperty('development') ? options.development : process.env.NODE_ENV !== 'production',
        fallthrough: options.hasOwnProperty('fallthrough') ? options.fallthrough : true,
        mockHeader: options.mockHeader || 'x-mock',
        mockQuery: options.mockQuery || 'x-mock',
        reqMockStatusCodeProperty: options.reqMockStatusCodeProperty || 'mockStatusCode',
        reqOpenApiProperty: options.reqOpenApiProperty || 'openapi',
        reqOperationProperty: options.reqOperationProperty || 'operation',
        xController: options.xController || 'x-controller',
        xOperation: options.xOperation || 'x-operation'
    };

    // validate general settings and store them
    if (typeof general.mockHeader !== 'string') throw Error('Configuration option "mockHeader" must be a string. Received: ' + general.mockHeader);
    if (typeof general.mockQuery !== 'string') throw Error('Configuration option "mockQuery" must be a string. Received: ' + general.mockQuery);
    if (typeof general.reqMockStatusCodeProperty !== 'string') throw Error('Configuration option "reqMockStatusCodeProperty" must be a string. Received: ' + general.reqMockStatusCodeProperty);
    if (typeof general.reqOpenApiProperty !== 'string') throw Error('Configuration option "reqOpenApiProperty" must be a string. Received: ' + general.reqOpenApiProperty);
    if (typeof general.reqOperationProperty !== 'string') throw Error('Configuration option "reqOperationProperty" must be a string. Received: ' + general.reqOperationProperty);
    if (typeof general.xController !== 'string') throw Error('Configuration option "xController" must be a string. Received: ' + general.xController);
    if (typeof general.xOperation !== 'string') throw Error('Configuration option "xOperation" must be a string. Received: ' + general.xOperation);
    this.options = general;

    // wait for the definition to be built
    this.promise = Enforcer(definition, { fullResult: true })
        .then(result => {
            const [ openapi, exception, warning ] = result;
            if (exception) throw Error(exception.toString());
            if (warning) console.warn(warning);
            return openapi
        })
        .catch(e => {
            console.error(e.stack);
            process.exit(1);
        })
}

OpenApiEnforcerMiddleware.prototype.controllers = function (controllersDirectoryPath, ...dependencyInjection) {
    const promise = this.promise
        .then(openapi => {
            const exception = new Enforcer.Exception('Unable to load one or more directory controllers within ' + controllersDirectoryPath)
            return mapControllers(exception, openapi, controllersDirectoryPath, dependencyInjection, this.options)
        });

    return (req, res, next) => {
        promise
            .then(controllers => {
                const operation = req[this.options.reqOperationProperty];
                const controller = controllers.get(operation);
                if (controller) {
                    res.set(ENFORCER_HEADER, 'controller');
                    debug.controllers('executing controller');
                    controller(req, res, next);
                } else {
                    next();
                }
            })
            .catch(next);
    };
}

OpenApiEnforcerMiddleware.prototype.mock = function (controllersDirectoryPath, automatic, ...dependencyInjection) {
    const options = this.options;
    if (arguments.length < 2) automatic = options.development;
    const promise = this.promise
        .then(openapi => {
            const exception = new Enforcer.Exception('Unable to load one or more directory mock controllers within ' + controllersDirectoryPath)
            return mapControllers(exception, openapi, controllersDirectoryPath, dependencyInjection, this.options)
        });
    return (req, res, next) => {
        promise
            .then(controllers => {
                const operation = req[this.options.reqOperationProperty];
                const controller = controllers.get(operation);

                // check to see if using manual mock or automatic
                const mockHeaderKey = options.mockHeader;
                const mockQueryKey = options.mockQuery;
                if (req.headers.hasOwnProperty(mockHeaderKey)) {
                    req[options.reqMockStatusCodeProperty] = req.headers[mockHeaderKey] || '';
                } else if (req.headers.hasOwnProperty(mockQueryKey)) {
                    req[options.reqMockStatusCodeProperty] = req.headers[mockQueryKey] || '';
                } else if (automatic) {
                    req[options.reqMockStatusCodeProperty] = '';
                }

                working here

                if (controller) {
                    res.set(ENFORCER_HEADER, 'controller');
                    debug.controllers('executing controller');
                    controller(req, res, next);
                } else {
                    next();
                }
            })
            .catch(next);
    };
}

function exceptionPushError (exception, error) {
    const stack = error.stack;
    if (stack) {
        const lines = stack.split(/\r\n|\r|\n/);
        const child = exception.nest(lines.shift());
        let line;
        while ((line = lines.shift())) {
            child.message(line);
        }
    } else {
        exception.message(String(error))
    }
}

function mapControllers (exception, openapi, controllerDirectoryPath, dependencyInjection, options) {
    const loadedControllers = {};
    const map = new Map();
    const xController = options.xController;
    const xOperation = options.xOperation;
    const rootController = openapi && openapi[xController];

    Object.keys(openapi.paths).forEach(pathKey => {
        const pathItem = openapi.paths[pathKey];
        const pathController = pathItem[xController];

        pathItem.methods.forEach(method => {
            const operation = pathItem && pathItem[method];
            const operationController = operation && operation[xController];
            const controllerName = operationController || pathController || rootController;
            const operationName = operation && (operation[xOperation] || operation.operationId);
            if (controllerName && operationName) {
                const controllerPath = path.resolve(controllerDirectoryPath, controllerName);
                const child = exception.at(controllerName);
                try {
                    if (!loadedControllers[controllerPath]) {
                        let controller = require(controllerPath);
                        if (typeof controller === 'function') controller = controller.apply(controller, dependencyInjection);
                        loadedControllers[controllerPath] = controller;
                    }
                    const controller = loadedControllers[controllerPath];
                    if (!controller.hasOwnProperty(operationName)) {
                        child.message('Property not found: ' + operationName)
                    } else if (typeof controller[operationName] !== 'function') {
                        child.message('Expected a function. Received: ' + controller[operationName])
                    } else {
                        map.set(operation, controller[operationName])
                    }
                } catch (err) {
                    exceptionPushError(child, err)
                }
            }
        });
    });

    if (exception.hasException) {
        options.development
            ? console.warn(exception)
            : throw Error(exception.toString())
    }

    return map;
}