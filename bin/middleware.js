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
    mock: Debug('openapi-enforcer-middleware:mock'),
    request: Debug('openapi-enforcer-middleware:request'),
    response: Debug('openapi-enforcer-middleware:response')
};

/**
 * Create an openapi middleware instance.
 * @param {object|string} schema
 * @param {object} [options]
 * @param {string} [options.controllers] The path to the base controllers directory.
 * @param {function} [options.dereference] The function to call to dereference any JSON references. Must return a promise that resolves to the dereferenced object.
 * @param {boolean} [options.development]
 * @param {boolean} [options.fallthrough=true]
 * @param {string} [options.mockControllers] The path to the base mocks directory. This allows for creating mocks through function calls.
 * @param {boolean} [options.mockEnabled=true] Set this value to true to allow manual mocking requests
 * @param {boolean} [options.mockFallback]
 * @param {string} [options.mockHeader='x-mock'] The name of the header to look for for manual mocking. Set to empty string to disable.
 * @param {string} [options.mockQuery='x-mock'] The name of the query string parameter to look for for manual mocking. Set to empty string to disable.
 * @param {string} [options.reqProperty='openapi'] The name of the property on the req object to store openapi data onto.
 * @param {string} [options.xController='x-controller'] The name of the property within the OpenAPI definition that describes which controller to use.
 * @param {string} [options.xOperation='x-operation'] The name of the operation within the OpenAPI definition that describes the method name within the controller to use. First "operation" will be used, then this value.
 * @returns {function}
 */
module.exports = OpenAPIEnforcerMiddleware;

function OpenAPIEnforcerMiddleware(schema, options) {

    // set option defaults
    if (!options) options = {};
    const development = options.hasOwnProperty('development')
        ? options.development
        : process.env.NODE_ENV !== 'production';

    // set option defaults
    options.development = development;
    if (!options.hasOwnProperty('dereference')) options.dereference = schema => RefParser.dereference(schema);
    if (!options.hasOwnProperty('fallthrough')) options.fallthrough = true;
    if (!options.hasOwnProperty('mockEnabled')) options.mockEnabled = options.hasOwnProperty('controllers');
    if (!options.hasOwnProperty('mockFallback')) options.mockFallback = development;
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
            const enforcer = new Enforcer(schema, {
                deserialize: { throw: false },
                errors: { prefix: '' },
                populate: { throw: false },
                request: { throw: false },
                serialize: { throw: false }
            });
            const errors = validateExamples(enforcer, schema);
            if (errors.length) {
                if (options.development) {
                    errors.forEach(error => console.log(error));
                } else {
                    throw Error('One or more examples do not match their schemas');
                }
            }

            return {
                enforcer: enforcer,
                schema: deepFreeze(schema)
            };
        })
        .catch(e => {
            console.error(e.stack);
            process.exit(1);
        });

    // create an enforcer instance
    const enforcer = new EnforcerMiddleware(options, promise);

    // add middlewares according to configuration options
    if (options.mockEnabled) enforcer.use(enforcer.mock({ automatic: false, controllers: options.mockControllers }));
    if (options.controllers) enforcer.use(enforcer.controllers({ controllers: options.controllers }));
    if (options.mockFallback) enforcer.use(enforcer.mock({ automatic: true, controllers: options.mockControllers }));

    // return middleware
    const result = (req, res, next) => {

        // make a copy of the request to be used just within this middleware
        req = Object.assign({}, req);

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
                code: res.statusCode
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

            // serialize - will validate with res.send(), so no need to double validate with serialize
            data.skipValidation = true;
            data.options = { throw: true };
            const result = response.serialize(data);
            debug.response('response serialized');

            // add openapi-enforcer header
            if (openapi.handlerName) res.set('x-openapi-enforcer', openapi.handlerName);

            // send response
            Object.keys(result.headers)
                .forEach(name => {
                    res.set(name, result.headers[name]);
                });
            res.send(result.body);
        };

        const beforeNext = function(err) {
            res.send = send;
            if (err && err.isOpenAPIException) {
                const message = err.toString();
                if (err.meta) {
                    const status = err.meta.statusCode;
                    if (status >= 400 && status < 500) {
                        res.status(status).send(message);
                    } else {
                        res.sendStatus(status);
                    }
                } else {
                    next(Error(message));
                }
            } else {
                next(err);
            }
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
    result.mock = enforcer.mock.bind(enforcer);
    result.use = enforcer.use.bind(enforcer);

    return result;
}

OpenAPIEnforcerMiddleware.Enforcer = Enforcer;



function EnforcerMiddleware(options, promise) {
    this.middlewares = [];
    this.options = options;
    this.promise = promise;
}

/**
 * Get middleware that executes the correct controller.
 * @param {object} options
 * @param {string} options.controllers The path to the controllers directory.
 * @returns {Function}
 */
EnforcerMiddleware.prototype.controllers = function(options) {
    if (!options) options = {};
    if (!options.hasOwnProperty('controllers')) throw Error('Controllers middleware missing required option: controllers');
    if (typeof options.controllers !== 'string') throw Error('Configuration option "controllers" must be a string. Received: ' + options.controllers);

    const promise = this.promise
        .then(data => mapControllers(data.schema, options.controllers, null, this.options));

    return (req, res, next) => {
        promise
            .then(controllers => {
                const openapi = req[this.options.reqProperty];
                const controller = controllers[openapi.pathId];

                if (controller) {
                    openapi.handlerName = 'controller';
                    debug.controllers('executing controller');
                    controller(req, res, next);

                } else {
                    // TODO: should there be a not implemented?
                    next();
                }
            })
            .catch(next);
    }
};

/**
 * Get middleware that generates a mock response.
 * @param {object} options
 * @param {boolean} [options.automatic=false] Set to true to automatically mock responses.
 * @param {string} options.controllers The path to the mock controllers directory
 * @returns {Function}
 */
EnforcerMiddleware.prototype.mock = function(options) {
    if (!options) options = {};
    if (!options.hasOwnProperty('automatic')) options.automatic = false;
    if (options.controllers && typeof options.controllers !== 'string') throw Error('Configuration option for mock "controllers" must be a string. Received: ' + options.controllers);

    const promise = this.promise
        .then(data => {
            return options.controllers
                ? mapControllers(data.schema, options.controllers, debug.controllers, this.options)
                : {};
        });

    return (req, res, next) => {
        promise
            .then(controllers => {
                const openapi = req[this.options.reqProperty];
                const controller = controllers[openapi.pathId];
                const mock = openapi.mock;
                const manualMock = mock && mock.manual;

                if (options.automatic || manualMock) {
                    openapi.handlerName = manualMock ? 'requested mock' : 'automatic mock';

                    if (!mock) {
                        debug.mock('unable to mock');
                        next();

                    } else if (mock.controller && controller) {
                        openapi.handlerName += ' controller';
                        debug.mock('executing mock controller');
                        controller(req, res, next);

                    } else {
                        openapi.handlerName += ' example';
                        debug.mock('creating mock from schema')

                        const code = mock.code;
                        const contentType = req.headers.accept || '*/*';
                        const response = openapi.response({ code, contentType });

                        // determine configuration for getting example
                        const exampleConfig = { ignoreDocumentExample: !mock.example };
                        if (typeof mock.example === 'string') exampleConfig.name = mock.example;

                        const example = response.example(exampleConfig);
                        res.status(code).send(example);
                    }

                } else {
                    next();
                }
            })
            .catch(next);
    }
};

EnforcerMiddleware.prototype.run = function(req, res, next) {
    const enforcer = this.enforcer;

    if (!this.middlewares.length) {
        console.log('WARNING: openapi-enforcer-middleware has nothing to run')
        return next()
    }

    // create the middleware runner that will restore res.send when last next is called
    const runner = middlewareRunner(this.middlewares, this.options, req, res, next);

    // parse, serialize, and validate request
    debug.request('validating and parsing');
    const requestObj = {
        headers: req.headers,
        method: req.method,
        path: req.originalUrl.substr(req.baseUrl.length)
    };
    if (req.hasOwnProperty('body')) requestObj.body = req.body;
    if (req.hasOwnProperty('cookies')) requestObj.cookies = req.cookies;
    let parsed = enforcer.request(requestObj);
    if (parsed.error) {
        req[this.options.reqProperty] = {};
        return parsedNextHandler(parsed, this.options, runner);
    }

    // create the openapi request object
    parsed = parsed.value;
    const method = req.method.toLowerCase();
    const responses = parsed.schema && parsed.schema[method] && parsed.schema[method].responses;
    const responseCodes = responses ? Object.keys(responses) : [];
    req[this.options.reqProperty] = {
        errors: parsed.errors,
        enforcer: enforcer,
        handlerName: '',
        method: method,
        mock: getMockData(responses, responseCodes, req, this.options),
        operation: parsed.schema,
        path: parsed.path,
        pathId: method + parsed.path,
        request: parsed.request,
        response: parsed.response,
        responseCodes: responseCodes,
        responses: responses,
        schema: this.schema,
        statusCode: parsed.statusCode
    };

    // copy the request object and merge parsed parameters into copy
    const request = parsed.request || {};
    request.params = request.path;
    //const reqCopy = Object.assign({}, req);
    ['cookies', 'headers', 'params', 'query'].forEach(key => req[key] = Object.assign({}, req[key], request[key]));
    if (request.hasOwnProperty('body')) req.body = request.body;

    // run next after analyzing parsed result
    parsedNextHandler(parsed, this.options, runner);
};

EnforcerMiddleware.prototype.use = function(middleware) {
    if (typeof middleware !== 'function') throw Error('Invalid input parameter. Expected a function received: ' + middleware);
    this.middlewares.push(middleware);
};





function getMockData(responses, responseCodes, req, options) {
    const defaultCode = responseCodes[0];
    const result = {
        controller: true,
        example: true,
        manual: false
    };

    let mock;

    // check for manual mock configuration settings
    if (options.mockHeader && req.headers.hasOwnProperty(options.mockHeader)) {
        mock = req.headers[options.mockHeader] || defaultCode;
        result.manual = true;
    } else if (options.mockQuery && req.query.hasOwnProperty(options.mockQuery)) {
        mock = req.query[options.mockQuery] || defaultCode;
        result.manual = true;
    } else if (responseCodes[0]) {
        mock = defaultCode;
    }

    // unable to mock
    if (!mock) return;

    // check that mock code exists otherwise unable to mock
    const ar = mock.split(';');
    const code = ar[0];
    if (!responses[code]) return;

    // parse mock data - ex: 200;controller=false&example=foo
    result.code = code;
    const pairs = ar[1] ? ar[1].split('&') : [];
    pairs.forEach(pair => {
        const kv = pair.split('=');
        const v = kv[1];
        switch(kv[0]) {
            case 'controller':
                result.controller = v !== 'false';
                break;
            case 'example':
                if (v === 'false') {
                    result.example = false;
                } else if (v === 'true' || v === '') {
                    result.example = true;
                } else {
                    result.example = v;
                }
                break;
        }
    })

    return result;
}

function deepFreeze(value) {
    if (value && typeof value === 'object') {
        Object.freeze(value);
        Object.keys(value).forEach(key => deepFreeze(value[key]));
    }
    return value;
}

// get a middleware runner "next" function
function middlewareRunner(middlewares, options, req, res, next) {
    middlewares = middlewares.slice(0);
    const run = err => {
        while (middlewares.length) {
            req[options.reqProperty].handlerName = '';
            const middleware = middlewares.shift();
            const isErrorHandling = middleware.length >= 4;
            try {
                if (err && isErrorHandling) {
                    return middleware(err, req, res, run);
                } else if (!err && !isErrorHandling) {
                    return middleware(req, res, run);
                }
            } catch (e) {
                return run(e)
            }
        }
        next(err);
    };
    return run;
}

function parsedNextHandler(parsed, options, next) {
    if (parsed.error) {
        const err = parsed.error;
        const statusCode = err.meta && err.meta.statusCode;
        if (statusCode === 404 && options.fallthrough) {
            debug.request('path not found');
            return next();
        } else {
            debug.request('request invalid');
            return next(err);
        }
    } else {
        next();
    }
}