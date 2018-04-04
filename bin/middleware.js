/**
 *  @license
 *    Copyright 2018 Brigham Young University
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
process.on('unhandledRejection', err => {
    console.error(err.stack);
    process.exit(1);
});

const debug     = require('debug')('oapi-enforcer-mw');
const Enforcer  = require('../../openapi-enforcer/index');  // require('openapi-enforcer');
const path      = require('path');
const RefParser = require('json-schema-ref-parser');

const sController = Symbol('controller');
const sMock = Symbol('mock');

module.exports = OpenApiMiddleware;

/**
 * Create an openapi middleware instance.
 * @param {object|string} schema
 * @param {object} [options]
 * @param {string} [options.controllers='$PWD'] The path to the base controllers directory.
 * @param {function} [options.dereference] The function to call to dereference any JSON references. Must return a promise that resolves to the dereferenced object.
 * @param {function} [options.invalid] A middleware function to call if there is a problem with the client request or server response.
 * @param {string} [options.mockProperty] The name of the property to look for on the headers or query string for manual mocking. Should begin with an x-. Set to blank to disable.
 * @param {string} [options.mockControllers] The path to the base mocks directory. This allows for creating mocks through function calls. Set to blank to disable.
 * @param {string} [options.reqProperty='openapi'] The name of the property on the req object to store openapi data onto.
 * @param {string} [options.valid] A middleware function to run if the request was valid but no controller exists to handle the request.
 * @param {string} [options.xController='x-controller'] The name of the property within the OpenAPI definition that describes which controller to use.
 * @param {string} [options.xOperation='x-operation'] The name of the operation within the OpenAPI definition that describes the method name within the controller to use. First "operation" will be used, then this value.
 * @constructor
 */
function OpenApiMiddleware(schema, options) {

    // set option defaults
    if (!options) options = {};
    if (!options.hasOwnProperty('controllers')) options.controllers = process.cwd();
    if (!options.hasOwnProperty('dereference')) options.dereference = schema => RefParser.dereference(schema);
    if (!options.hasOwnProperty('development')) options.development = process.env.NODE_ENV !== 'production';
    if (!options.hasOwnProperty('invalid')) options.invalid = (err, req, res, next) => {
        if (err.code === OpenApiMiddleware.ERROR) {
            res.status(err.statusCode);
            res.write(err.message);
            res.end();
        } else {
            next(err);
        }
    };
    if (!options.hasOwnProperty('mockProperty')) options.mockProperty = 'x-mock';
    if (!options.hasOwnProperty('reqProperty')) options.reqProperty = 'openapi';
    if (!options.hasOwnProperty('xController')) options.xController = 'x-controller';
    if (!options.hasOwnProperty('xOperation')) options.xOperation = 'x-operation';

    // validate options
    if (typeof options.controllers !== 'string') throw Error('Configuration option "controllers" must be a string. Received: ' + options.controllers);
    if (typeof options.dereference !== 'function') throw Error('Configuration option "dereference" must be a function. Received: ' + options.dereference);
    if (typeof options.invalid !== 'function') throw Error('Configuration option "invalid" must be a function. Received: ' + options.invalid);
    if (options.mockControllers && typeof options.mockControllers !== 'string') throw Error('Configuration option "mockControllers" must be a string. Received: ' + options.mockControllers);
    if (options.mockProperty && typeof options.mockProperty !== 'string') throw Error('Configuration option "mockProperty" must be a string. Received: ' + options.mockProperty);
    if (typeof options.reqProperty !== 'string') throw Error('Configuration option "reqProperty" must be a string. Received: ' + options.reqProperty);
    if (typeof options.xController !== 'string') throw Error('Configuration option "xController" must be a string. Received: ' + options.xController);
    if (typeof options.xOperation !== 'string') throw Error('Configuration option "xOperation" must be a string. Received: ' + options.xOperation);

    const promise = options.dereference(schema)
        .then(schema => {

            // TODO: validate examples

            // load controller and mock methods
            const errors = [];
            loadControllers(errors, options, schema);

            // if development then report errors and continue, otherwise throw errors and exit
            if (errors.length > 0) {
                const message = 'Could not load some controllers:\n  ' +
                    errors.map(e => e.stack.replace(/^([\s\S]*?)$/gm, '  $1'));
                if (options.development) {
                    console.log(message);
                } else {
                    console.error(message);
                    process.exit(1);
                }
            }

            return {
                enforcer: new Enforcer(schema),
                schema: schema
            };
        });

    // return middleware function
    return (req, res, next) => {

        // overwrite req.send
        const send = req.send;
        req.send = function(data) {
            // TODO: validate response
            send.call(res, data);
        };

        // restore req.send
        function beforeNext(err) {
            req.send = send;
            next(err);
        }

        promise
            .then(data => {
                const enforcer = data.enforcer;
                const schema = data.schema;

                const parsed = enforcer.request({
                    body: req.body,
                    cookie: req.cookies,
                    header: req.headers,
                    method: req.method,
                    path: req.originalUrl.substr(req.baseUrl.length)
                });

                if (parsed.errors) {
                    const err = Error(parsed.errors.join('\n'));
                    err.statusCode = parsed.statusCode || 400;
                    err.code = OpenApiMiddleware.ERROR;
                    options.invalid(err, req, res, beforeNext);

                } else {
                    const p = parsed.request;
                    req.body = p.body;
                    Object.assign(req.cookies || {}, p.cookie);
                    Object.assign(req.headers, p.header);
                    Object.assign(req.params, p.path);
                    Object.assign(req.query, p.query);

                    // create the openapi request property
                    const openapi = req[options.reqProperty] = {};
                    openapi.enforcer = enforcer;
                    openapi.path = parsed.path;
                    openapi.pathSchema = parsed.schema;
                    openapi.response = parsed.response;
                    openapi.schema = enforcer.schema();

                    // check if the mock property was supplied
                    openapi.mock = options.mockProperty
                        ? req.headers[options.mockProperty] || req.query[options.mockProperty]
                        : undefined;

                    // use controller to generate response
                    const method = req.method.toLowerCase();
                    const methodSchema = schema.paths[openapi.path][method];

                    if (!methodSchema) {
                        const err = Error('Method not allowed');
                        err.statusCode = 405;
                        err.code = OpenApiMiddleware.ERROR;
                        options.invalid(err, req, res, beforeNext);

                    // execute controller
                    } else if (methodSchema[sController] && !openapi.mock) {
                        methodSchema[sController](req, res, beforeNext);

                    // execute mock
                    } else if (options.development || openapi.mock) {
                        const mockController = methodSchema && methodSchema[sMock];

                        // use defined mock controller
                        if (mockController) {
                            mockController(req, res, beforeNext);

                        // mock using example or schema
                        } else {
                            const responses = openapi.pathSchema[req.method.toLowerCase()].responses;
                            const codes = responses && Object.keys(responses);
                            if (!codes || (openapi.mock && !responses[openapi.mock])) {
                                const err = Error('Cannot auto-generate mock response without schema');
                                err.statusCode = 501;
                                err.code = OpenApiMiddleware.ERROR;
                                options.invalid(err, req, res, beforeNext);

                            } else {
                                if (!openapi.mock) openapi.mock = codes[0];
                                generateMockResponse(options, req, res, beforeNext);
                            }
                        }

                    } else {
                        const err = Error('Controller not implemented');
                        err.statusCode = 501;
                        err.code = OpenApiMiddleware.ERROR;
                        options.invalid(err, req, res, beforeNext);
                    }
                }
            })
            .catch(beforeNext);
    };
}

Object.defineProperty(OpenApiMiddleware, 'ERROR', {
    value: Symbol('OpenAPI Middleware Error')
});


function generateMockResponse(options, req, res, next) {
    const openapi = req.openapi;
    const data = openapi.response.example(openapi.mock, req.header.accept);
    if (data) {
        res.set('content-type', data.contentType);
        res.send(data.example.body);
    } else {
        const err = Error('No example to mock provide as mock.');
        err.statusCode = 501;
        err.code = OpenApiMiddleware.ERROR;
        options.invalid(err, req, res, next);
    }
}

// replace schema x-controller string with required controller objects
function loadController(errors, options, schema) {
    const xController = options.xController;
    const controllersBasePath = options.controllers;
    const mocksBasePath = options.mockControllers;
    const result = {};

    const name = schema[xController];
    if (name && typeof name === 'string') {

        const controllerPath = path.resolve(controllersBasePath, name);
        try {
            result.controller = require(controllerPath);
            debug('controller loaded: ' + controllerPath);
        } catch (err) {
            debug('controller not loaded: ' + controllerPath);
            errors.push(err);
        }

        if (mocksBasePath) {
            const mockPath = path.resolve(mocksBasePath, name);
            try {
                result.mock = require(mockPath);
                debug('mock loaded: ' + controllerPath);
            } catch (err) {
                debug('mock not loaded: ' + controllerPath);
            }
        }
    }

    return result;
}

function loadControllers(errors, options, schema) {
    const methods = ['get', 'post', 'put', 'delete', 'options', 'head', 'trace'];
    const rootControllers = loadController(errors, options, schema);
    Object.keys(schema.paths).forEach(pathKey => {
        const pathSchema = schema.paths[pathKey];
        const pathControllers = loadController(errors, options, pathSchema);
        methods.forEach(method => {
            const methodSchema = pathSchema[method];
            if (methodSchema) {
                const methodControllers = loadController(errors, options, methodSchema);
                methodSchema[sController] = methodControllers.controller || pathControllers.controller || rootControllers.controller;
                methodSchema[sMock] = methodControllers.mock || pathControllers.mock || rootControllers.mock;
            }
        });
    });
}