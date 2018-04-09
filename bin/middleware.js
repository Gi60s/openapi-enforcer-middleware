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
// TODO: get rid of this unhandledRejection listener
process.on('unhandledRejection', err => {
    console.error(err.stack);
    process.exit(1);
});

const debug             = require('debug')('oapi-enforcer-middleware');
const Enforcer          = require('../../openapi-enforcer/index');  // require('openapi-enforcer');
const mapControllers    = require('./map-controllers');
const path              = require('path');
const RefParser         = require('json-schema-ref-parser');
const validateExamples  = require('./validate-examples');

const sController = Symbol('controller');
const sMock = Symbol('mock');





module.exports = EnforcerMiddleware;

/**
 * Create an openapi middleware instance.
 * @param {object|string} schema
 * @param {object} [options]
 * @param {string} [options.controllers] The path to the base controllers directory.
 * @param {function} [options.dereference] The function to call to dereference any JSON references. Must return a promise that resolves to the dereferenced object.
 * @param {boolean} [options.development] Whether in development mode. Defaults to true unless the NODE_ENV environment variable is set to "production".
 * @param {function} [options.invalid] A middleware function to call if there is a problem with the client request or server response.
 * @param {string} [options.mockControllers] The path to the base mocks directory. This allows for creating mocks through function calls.
 * @param {string} [options.mockHeader='x-mock'] The name of the header to look for for manual mocking. Set to empty string to disable.
 * @param {string} [options.mockQuery='x-mock'] The name of the query string parameter to look for for manual mocking. Set to empty string to disable.
 * @param {string} [options.reqProperty='openapi'] The name of the property on the req object to store openapi data onto.
 * @param {string} [options.valid] A middleware function to run if the request was valid but no controller exists to handle the request.
 * @param {string} [options.xController='x-controller'] The name of the property within the OpenAPI definition that describes which controller to use.
 * @param {string} [options.xOperation='x-operation'] The name of the operation within the OpenAPI definition that describes the method name within the controller to use. First "operation" will be used, then this value.
 * @returns {function}
 */
function EnforcerMiddleware(schema, options) {

    // set option defaults
    if (!options) options = {};
    if (!options.hasOwnProperty('dereference')) options.dereference = schema => RefParser.dereference(schema);
    if (!options.hasOwnProperty('development')) options.development = process.env.NODE_ENV !== 'production';
    if (!options.hasOwnProperty('invalid')) options.invalid = invalid;
    if (!options.hasOwnProperty('mockHeader')) options.mockHeader = 'x-mock';
    if (!options.hasOwnProperty('mockQuery')) options.mockQuery = 'x-mock';
    if (!options.hasOwnProperty('reqProperty')) options.reqProperty = 'openapi';
    if (!options.hasOwnProperty('xController')) options.xController = 'x-controller';
    if (!options.hasOwnProperty('xOperation')) options.xOperation = 'x-operation';

    // validate options
    if (options.hasOwnProperty('controllers') && typeof options.controllers !== 'string') throw Error('Configuration option "controllers" must be a string. Received: ' + options.controllers);
    if (typeof options.dereference !== 'function') throw Error('Configuration option "dereference" must be a function. Received: ' + options.dereference);
    if (typeof options.invalid !== 'function') throw Error('Configuration option "invalid" must be a function. Received: ' + options.invalid);
    if (options.hasOwnProperty('mockControllers') && typeof options.mockControllers !== 'string') throw Error('Configuration option "mockControllers" must be a string. Received: ' + options.mockControllers);
    if (options.mockHeader && typeof options.mockHeader !== 'string') throw Error('Configuration option "mockHeader" must be a string. Received: ' + options.mockHeader);
    if (options.mockQuery && typeof options.mockQuery !== 'string') throw Error('Configuration option "mockQuery" must be a string. Received: ' + options.mockQuery);
    if (typeof options.reqProperty !== 'string') throw Error('Configuration option "reqProperty" must be a string. Received: ' + options.reqProperty);
    if (options.hasOwnProperty('valid') && typeof options.valid !== 'function') throw Error('Configuration option "valid" must be a function. Received: ' + options.valid);
    if (typeof options.xController !== 'string') throw Error('Configuration option "xController" must be a string. Received: ' + options.xController);
    if (typeof options.xOperation !== 'string') throw Error('Configuration option "xOperation" must be a string. Received: ' + options.xOperation);

    const controllers = {};
    const middlewares = [];
    const promise = options.dereference(schema)
        .then(schema => {
            const valid = validateExamples(schema) && mapControllers(controllers, schema, options);
            if (!options.development && !valid) process.exit(1);
            return {
                enforcer: new Enforcer(schema),
                schema: deepFreeze(schema)
            };
        });

    // the initialization function
    function enforcerMiddleware(req, res, next) {

        // overwrite res.send
        const send = res.send;
        req.send = function(data) {
            // TODO: validate response
            send.call(res, data);
        };

        // restore res.send when next is called
        const _next = next;
        next = err => {
            res.send = send;
            _next(err);
        };

        const mws = middlewares.slice(0);
        function runMiddlewares(err, req, res, next) {

            // TODO: working here

            if (!mws.length) next(err);

            let middleware;
            if (err) {
                middleware = mws.shift();
                if ()
            } else if (!err) {

            } else {

            }
        }

        promise
            .then(data => {
                const enforcer = data.enforcer;

                // parse, serialize, and validate request
                const parsed = enforcer.request({
                    body: req.body,
                    cookies: req.cookies,
                    headers: req.headers,
                    method: req.method,
                    path: req.originalUrl.substr(req.baseUrl.length)
                });

                // if there is a client request error then call next middleware with error
                if (parsed.errors) {
                    const err = Error(parsed.errors.join('\n'));
                    err.statusCode = parsed.statusCode;
                    err.code = OpenApiMiddleware.ERROR;
                    return options.invalid(err, req, res, next);
                }

                // create the openapi request property
                const openapi = req[options.reqProperty] = {
                    enforcer: enforcer,
                    operation: parsed.schema,
                    path: parsed.path,
                    request: parsed.request,
                    response: parsed.response,
                    schema: data.schema
                };

                // overwrite the request object
                const request = parsed.request;
                const _req = req;
                req = Object.assign({}, _req, {
                    cookies: request.cookies,
                    headers: request.headers,
                    params: request.path,
                    query: request.query
                });
                if (request.hasOwnProperty('body')) req.body = request.body;

                // get response codes
                const codes = Object.keys(openapi.responses);

                // get controller data
                const controller = controllers[req.method.toLowerCase() + openapi.path];

                // detect manual mocking
                const mock = getManualMock(req, options);

                // execute controller
                if (controller.controller && !mock) return controller.controller(req, res, next);

                // execute the mock
                if (options.development || mock) {

                    // mock using controller
                    if (controller.mock) return controller.mock(req, res, next);

                    // if no response codes then nothing to mock
                    if (!codes.length) return runMiddlewares(notImplemented(), req, res);

                    // get the mock response code
                    const code = (mock && mock.code) || codes[0];

                    // handle case where mock not available
                    if (!code || !openapi.responses || !openapi.responses[code]) return runMiddlewares(notImplemented(), req, res);

                    // mock from example
                    const contentType = req.headers.accepts || '*/*';
                    const example = openapi.response({ code, contentType }).example((mock && mock.config) || {});
                    return res.status(code).send(example);
                }

                return runMiddlewares(notImplemented(), req, res);
            })
            .catch(next);
    }

    enforcerMiddleware.use = function(middleware) {
        if (typeof middleware !== 'function') throw Error('Invalid input parameter. Expected a function received: ' + middleware);
        middlewares.push(middleware);
    };


    // return middleware function
    return enforcerMiddleware;
}


Object.defineProperty(OpenApiMiddleware, 'ERROR', {
    value: Symbol('OpenAPI Middleware Error')
});





function getManualMock(req, options) {
    const responses = req[options.reqProperty].responses;
    const codes = Object.keys(responses);
    let manual;

    // use specified mock code or if empty string use first response code
    if (options.mockHeader && req.headers.hasOwnProperty(options.mockHeader)) {
        manual = req.headers[options.mockHeader] || codes[0];
    } else if (options.mockQuery && req.query.hasOwnProperty(options.mockQuery)) {
        manual = req.query[options.mockQuery] || codes[0];
    }

    if (manual) {
        const array = manual.split(',');
        const code = array[0] || codes[0];
        if (!responses[code]) return;

        let config = {};
        switch(array[1]) {
            case '*':
                config.ignoreDocumentExample = true;
                break;
            case '':
            case undefined:
                break;
            default:
                config.name = array[1];
                break;
        }

        return { code, config };
    }

    return {};
}

function invalid(err, req, res, next) {
    if (err.code === OpenApiMiddleware.ERROR) {
        res.status(err.statusCode);
        res.write(err.message);
        res.end();
    } else {
        next(err);
    }
}

function deepFreeze(value) {
    if (value && typeof value === 'object') {
        Object.freeze(value);
        Object.keys(value).forEach(key => deepFreeze(value[key]));
    }
    return value;
}

function notImplemented() {
    const err = Error('Not implemented');
    err.statusCode = 501;
    err.code = OpenApiMiddleware.ERROR;
    return err;
}