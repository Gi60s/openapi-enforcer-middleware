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

const Debug             = require('debug');
const Enforcer          = require('openapi-enforcer');
const mapControllers    = require('./map-controllers');
const RefParser         = require('json-schema-ref-parser');
const validateExamples  = require('./validate-examples');

const debug = {
    controllers: Debug('openapi-enforcer-middleware:controllers'),
    request: Debug('openapi-enforcer-middleware:request'),  // TODO: add request and response debug logs
    response: Debug('openapi-enforcer-middleware:response')
};

const ERROR_CODE = 'E_OPENAPI_ENFORCER_MIDDLEWARE';

/**
 * Create an openapi middleware instance.
 * @param {object|string} schema
 * @param {object} [options]
 * @param {string} [options.controllers] The path to the base controllers directory.
 * @param {function} [options.dereference] The function to call to dereference any JSON references. Must return a promise that resolves to the dereferenced object.
 * @param {boolean} [options.development] Whether in development mode. Defaults to true unless the NODE_ENV environment variable is set to "production".
 * @param {boolean} [options.fallthrough=true]
 * @param {boolean} [options.mockFallback=false]
 * @param {string} [options.mockControllers] The path to the base mocks directory. This allows for creating mocks through function calls.
 * @param {string} [options.mockHeader='x-mock'] The name of the header to look for for manual mocking. Set to empty string to disable.
 * @param {string} [options.mockQuery='x-mock'] The name of the query string parameter to look for for manual mocking. Set to empty string to disable.
 * @param {string} [options.reqProperty='openapi'] The name of the property on the req object to store openapi data onto.
 * @param {string} [options.xController='x-controller'] The name of the property within the OpenAPI definition that describes which controller to use.
 * @param {string} [options.xOperation='x-operation'] The name of the operation within the OpenAPI definition that describes the method name within the controller to use. First "operation" will be used, then this value.
 * @returns {function}
 */
module.exports = function(schema, options) {

    // set option defaults
    if (!options) options = {};
    if (!options.hasOwnProperty('dereference')) options.dereference = schema => RefParser.dereference(schema);
    if (!options.hasOwnProperty('development')) options.development = process.env.NODE_ENV !== 'production';
    if (!options.hasOwnProperty('fallthrough')) options.fallthrough = true;
    if (!options.hasOwnProperty('mockFallback')) options.mockFallback = false;
    if (!options.hasOwnProperty('mockHeader')) options.mockHeader = 'x-mock';
    if (!options.hasOwnProperty('mockQuery')) options.mockQuery = 'x-mock';
    if (!options.hasOwnProperty('reqProperty')) options.reqProperty = 'openapi';
    if (!options.hasOwnProperty('xController')) options.xController = 'x-controller';
    if (!options.hasOwnProperty('xOperation')) options.xOperation = 'x-operation';

    // validate options
    if (options.hasOwnProperty('controllers') && typeof options.controllers !== 'string') throw Error('Configuration option "controllers" must be a string. Received: ' + options.controllers);
    if (typeof options.dereference !== 'function') throw Error('Configuration option "dereference" must be a function. Received: ' + options.dereference);
    if (options.hasOwnProperty('mockControllers') && typeof options.mockControllers !== 'string') throw Error('Configuration option "mockControllers" must be a string. Received: ' + options.mockControllers);
    if (options.mockHeader && typeof options.mockHeader !== 'string') throw Error('Configuration option "mockHeader" must be a string. Received: ' + options.mockHeader);
    if (options.mockQuery && typeof options.mockQuery !== 'string') throw Error('Configuration option "mockQuery" must be a string. Received: ' + options.mockQuery);
    if (typeof options.reqProperty !== 'string') throw Error('Configuration option "reqProperty" must be a string. Received: ' + options.reqProperty);
    if (typeof options.xController !== 'string') throw Error('Configuration option "xController" must be a string. Received: ' + options.xController);
    if (typeof options.xOperation !== 'string') throw Error('Configuration option "xOperation" must be a string. Received: ' + options.xOperation);

    // dereference schema and populate controllers
    const promise = options.dereference(schema)
        .then(schema => {
            const enforcer = new Enforcer(schema);
            if (!validateExamples(enforcer, schema) && !options.development) throw Error('One or more examples do not match their schemas');
            return {
                enforcer: enforcer,
                schema: deepFreeze(schema)
            };
        });

    // create an enforcer instance
    const enforcer = new EnforcerMiddleware(options, promise);

    // if a controllers and/or mocks directory has been specified then we have a controllers middleware to execute
    if (options.mockFallback || options.controllers || options.mockControllers) {
        enforcer.use(enforcer.controllers(options));
    }

    // return middleware
    const result = (req, res, next) => {

        // overwrite res.send
        const send = res.send;
        res.send = function(body) {
            res.send = send;

            const openapi = req[options.reqProperty];
            const headers = res.getHeaders();
            const data = { body, headers };

            // create the response object
            const response = openapi.response({
                contentType: headers['content-type'],
                statusCode: res.statusCode,
            });

            // check for errors
            const errors = response.errors(data);
            debug.response('validating response');
            if (errors) {
                const message = '\n  ' + errors.join('\n  ');
                debug.response('response invalid:' + message);
                return options.development
                    ? res.set('content-type', 'text/plain').status(500).send('Response invalid:' + message)
                    : res.sendStatus(500);
            } else {
                debug.response('response valid');
            }

            // serialize
            data.skipValidation = true;
            const result = response.serialize(data);
            debug.response('response serialized');

            // send response
            Object.keys(result.headers)
                .forEach(name => {
                    res.set(name, result.headers[name]);
                });
            res.send(result.body);
        };

        const beforeNext = function(err) {
            res.send = send;
            next(err);
        };

        promise
            .then(data => {
                if (!enforcer.schema) {
                    enforcer.enforcer = data.enforcer;
                    enforcer.schema = data.schema;
                }
                enforcer.run(req, res, beforeNext);
            })
            .catch(beforeNext);
    };

    result.controllers = enforcer.controllers.bind(enforcer);
    result.use = enforcer.use.bind(enforcer);

    return result;
};

Object.defineProperty(module.exports, 'ERROR_CODE', {
    value: ERROR_CODE
});



function EnforcerMiddleware(options, promise) {
    this.middlewares = [];
    this.options = options;
    this.promise = promise;
}

EnforcerMiddleware.prototype.controllers = function(options) {
    if (!options) options = {};
    if (!options.hasOwnProperty('fallthrough')) options.fallthrough = this.options.fallthrough;
    if (!options.hasOwnProperty('mockFallback')) options.mockFallback = this.options.mockFallback;
    if (options.hasOwnProperty('controllers') && typeof options.controllers !== 'string') throw Error('Configuration option "controllers" must be a string. Received: ' + options.controllers);
    if (options.hasOwnProperty('mockControllers') && typeof options.mockControllers !== 'string') throw Error('Configuration option "mockControllers" must be a string. Received: ' + options.mockControllers);

    const controllers = {};
    this.promise
        .then(data => {
            const hasErrors = mapControllers(controllers, data.schema, options);
            if (hasErrors && !options.development) throw Error('One or more errors encountered while loading controllers');
        });

    return (req, res, next) => {
        const method = req.method.toLowerCase();
        const openapi = req[this.options.reqProperty];

        // if the openapi property has errors then handler them
        if (openapi.errors) return parsedNextHandler(openapi, options, next);

        // get operation responses
        const responses = openapi.operation[method].responses;

        // get response codes
        const codes = responses ? Object.keys(responses) : [];

        // get controller data
        const controller = controllers[method + openapi.path];

        // detect manual mocking
        const mock = getManualMock(req, this.options);

        // execute controller
        if (controller.controller && !mock) {
            debug.controllers('executing controller');
            return controller.controller(req, res, next);
        }

        // execute the mock
        if (options.mockFallback || mock) {

            // mock using controller
            if (controller.mock) {
                debug.controllers('executing mock controller');
                return controller.mock(req, res, next);
            }

            // if no response codes then nothing to mock
            if (!codes.length) {
                debug.controllers('no responses to mock');
                return next(notImplemented());
            }

            // get the mock response code
            const code = (mock && mock.code) || codes[0];

            // handle case where mock not available
            if (!code || !responses || !responses[code]) {
                debug.controllers('mock response code not implemented');
                return next(notImplemented());
            }

            // mock from example
            const contentType = req.headers.accept || '*/*';
            const response = openapi.response({ code, contentType });
            const example = response.example((mock && mock.config) || {});
            debug.controllers('automatic mock');
            return res.status(code).send(example);
        }

        debug.controllers('not implemented');
        return next(notImplemented());
    }
};

EnforcerMiddleware.prototype.run = function(req, res, next) {
    const enforcer = this.enforcer;

    if (!this.middlewares.length) {
        console.log('WARNING: openapi-enforcer-middleware has nothing to run')
        return next()
    }

    // create the middleware runner that will restore res.send when last next is called
    const runner = middlewareRunner(this.middlewares, req, res, next);

    // parse, serialize, and validate request
    debug.request('validating and parsing');
    const parsed = enforcer.request({
        body: req.body,
        cookies: req.cookies,
        headers: req.headers,
        method: req.method,
        path: req.originalUrl.substr(req.baseUrl.length)
    });

    // create the openapi request property
    req[this.options.reqProperty] = {
        errors: parsed.errors,
        enforcer: enforcer,
        operation: parsed.schema,
        path: parsed.path,
        request: parsed.request,
        response: parsed.response,
        schema: this.schema,
        statusCode: parsed.statusCode
    };

    // copy the request object and merge parsed parameters into copy
    const request = parsed.request || {};
    request.params = request.path;
    const reqCopy = Object.assign({}, req);
    ['cookies', 'headers', 'params', 'query']
        .forEach(key => reqCopy[key] = Object.assign({}, reqCopy[key], request[key]));
    if (request.hasOwnProperty('body')) reqCopy.body = request.body;

    // run next after analyzing parsed result
    parsedNextHandler(parsed, this.options, runner);
};

EnforcerMiddleware.prototype.use = function(middleware) {
    if (typeof middleware !== 'function') throw Error('Invalid input parameter. Expected a function received: ' + middleware);
    this.middlewares.push(middleware);
};





function getManualMock(req, options) {
    const method = req.method.toLowerCase();
    const openapi = req[options.reqProperty];

    const responses = openapi.operation[method].responses;
    const codes = responses ? Object.keys(responses) : [];
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
}

function deepFreeze(value) {
    if (value && typeof value === 'object') {
        Object.freeze(value);
        Object.keys(value).forEach(key => deepFreeze(value[key]));
    }
    return value;
}

// get a middleware runner "next" function
function middlewareRunner(middlewares, req, res, next) {
    middlewares = middlewares.slice(0);
    const run = err => {
        while (middlewares.length) {
            const middleware = middlewares.shift();
            const isErrorHandling = middleware.length >= 4;
            if (err && isErrorHandling) {
                return middleware(err, req, res, run);
            } else if (!err && !isErrorHandling) {
                return middleware(req, res, run);
            }
        }
        next(err);
    };
    return run;
}

function notImplemented() {
    const err = Error('Not implemented');
    err.statusCode = 501;
    err.code = ERROR_CODE;
    return err;
}

function parsedNextHandler(parsed, options, next) {
    if (parsed.errors) {
        if (parsed.statusCode === 404 && options.fallthrough) {
            debug.request('path not found');
            return next();
        } else {
            const message = parsed.errors.join('\n');
            debug.request('request invalid');
            debug.request(message);
            const err = Error(message);
            err.statusCode = parsed.statusCode;
            err.code = ERROR_CODE;
            return next(err);
        }
    } else {
        next();
    }
}