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
const mapControllers    = require('./map-controllers');

module.exports = EnforcerMiddleware;


const debug = {
    controllers: Debug('openapi-enforcer-middleware:controllers'),
    mock: Debug('openapi-enforcer-middleware:mock'),
    request: Debug('openapi-enforcer-middleware:request'),
    response: Debug('openapi-enforcer-middleware:response')
};

function EnforcerMiddleware(options, promise) {
    const middlewares = [];
    const gOptions = options;
    let enforcer;
    let schema;

    // as soon as the promise fulfills get the schema and enforcer instance
    promise = promise
        .then(data => {
            enforcer = data.enforcer;
            schema = data.schema;
        })
        .catch(() => {})

    function middleware(req, res, next) {
        // runner will be initialized after promise resolves
        let runner;

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
            const exception = response.validate(data);
            debug.response('validating response');
            if (exception) {
                debug.response('response invalid:' + '\n  ' + exception);
                return runner(exception);
            } else {
                debug.response('response valid');
            }

            // serialize - will validate with res.send(), so no need to double validate with serialize
            data.skipValidation = true;
            data.options = { throw: true };
            const result = response.serialize(data);
            debug.response('response serialized');

            // add openapi-enforcer header
            res.set('x-openapi-enforcer', openapi.handlerName || 'true');

            // send response
            Object.keys(result.headers)
                .forEach(name => {
                    res.set(name, result.headers[name]);
                });
            res.send(result.body);
        };

        promise
            .then(() => {

                // if there is nothing to run then exit to express middleware
                if (!middlewares.length) {
                    console.log('WARNING: openapi-enforcer-middleware has nothing to run');
                    res.set('x-openapi-enforcer', 'no middleware');
                    return next()
                }

                runner = initializeRunner(enforcer, middlewares, gOptions, schema, req, res, err => {
                    delete req[options.reqProperty];
                    res.send = send;

                    // convert enforcer exception into
                    if (err && err.isOpenAPIException) {
                        const message = err.toString();
                        if (err.meta) {
                            res.set('x-openapi-enforcer', 'exception');
                            const status = err.meta.statusCode;
                            if (status >= 400 && status < 500) {
                                res.status(status).send(message);
                            } else if (status >= 500 && options.development) {
                                res.set('content-type', 'text/plain').status(500).send(message);
                            } else {
                                res.sendStatus(status);
                            }
                        } else {
                            res.set('x-openapi-enforcer', 'fallthrough');
                            next(Error(message));
                        }
                    } else {
                        res.set('x-openapi-enforcer', 'fallthrough');
                        next(err);
                    }
                });
            })
            .catch(next);
    }

    middleware.controllers = options => controllers(promise, gOptions, options);
    middleware.mock = options => mock(promise, gOptions, options);
    middleware.use = fn => {
        if (typeof fn !== 'function') throw Error('Invalid input parameter. Expected a function received: ' + fn);
        middlewares.push(fn);
    };

    return middleware;
}

/**
 * Get middleware that executes the correct controller.
 * @param {Promise} promise The dereference promise.
 * @param {object} gOptions Global options for instance.
 * @param {object} options
 * @param {string} options.controllers The path to the controllers directory.
 * @returns {Function}
 */
function controllers(promise, gOptions, options) {
    if (!options) options = {};
    if (!options.hasOwnProperty('controllers')) throw Error('Controllers middleware missing required option: controllers');
    if (typeof options.controllers !== 'string') throw Error('Configuration option "controllers" must be a string. Received: ' + options.controllers);

    promise = promise
        .then(data => mapControllers(data.schema, options.controllers, null, gOptions));

    return (req, res, next) => {
        promise
            .then(controllers => {
                const openapi = req[gOptions.reqProperty];
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
}

/**
 * Get middleware that generates a mock response.
 * @param {Promise} promise The dereference promise.
 * @param {object} gOptions Global options for instance.
 * @param {object} options
 * @param {boolean} [options.automatic=false] Set to true to automatically mock responses.
 * @param {string} options.controllers The path to the mock controllers directory
 * @returns {Function}
 */
function mock(promise, gOptions, options) {
    if (!options) options = {};
    if (!options.hasOwnProperty('automatic')) options.automatic = false;
    if (options.controllers && typeof options.controllers !== 'string') throw Error('Configuration option for mock "controllers" must be a string. Received: ' + options.controllers);
    
    // get a promise that resolves to the loaded controllers
    promise = promise
        .then(data => {
            return options.controllers
                ? mapControllers(data.schema, options.controllers, debug.controllers, gOptions)
                : {};
        });

    return (req, res, next) => {
        promise
            .then(controllers => {
                const openapi = req[gOptions.reqProperty];
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
}





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



function initializeRunner(enforcer, middlewares, options, schema, req, res, next) {

    // create the middleware runner that will restore res.send when last next is called
    const runner = middlewareRunner(middlewares, options, req, res, next);

    // parse, serialize, and validate request
    debug.request('validating and parsing');
    const requestObj = {
        headers: req.headers,
        method: req.method,
        path: req.originalUrl.substr(req.baseUrl.length)
    };
    if (req.hasOwnProperty('body')) requestObj.body = req.body;
    if (req.hasOwnProperty('cookies')) requestObj.cookies = req.cookies;
    const parsed = enforcer.request(requestObj);

    // create the openapi request object
    const value = parsed.value || {};
    const method = req.method.toLowerCase();
    const responses = value.schema && value.schema[method] && value.schema[method].responses;
    const responseCodes = responses ? Object.keys(responses) : [];
    req[options.reqProperty] = {
        errors: value.errors,
        enforcer: enforcer,
        handlerName: '',
        method: method,
        mock: getMockData(responses, responseCodes, req, options),
        operation: value.schema,
        path: value.path,
        pathId: method + value.path,
        request: value.request,
        response: value.response,
        responseCodes: responseCodes,
        responses: responses,
        schema: schema,
        statusCode: value.statusCode
    };

    // copy the request object and merge parsed parameters into copy
    req.params = value.params || {};
    ['cookies', 'headers', 'params', 'query'].forEach(key => req[key] = Object.assign({}, req[key], value[key]));
    if (value.hasOwnProperty('body')) req.body = value.body;

    if (parsed.error) {
        const err = parsed.error;
        const statusCode = err.meta && err.meta.statusCode;

        // if 404 and fallthrough then exit to express middleware
        if (statusCode === 404 && options.fallthrough) {
            debug.request('path not found');
            next();

        // run own middleware with error
        } else {
            debug.request('request invalid');
            process.nextTick(() => runner(err));
        }

    } else {
        // run own middleware
        process.nextTick(() => runner());
    }

    return runner;
}