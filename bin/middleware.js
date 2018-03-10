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
const debug     = require('debug')('oapi-enforcer-mw');
const Enforcer  = require('../../openapi-enforcer/index');  // require('openapi-enforcer');
const path      = require('path');
const RefParser = require('json-schema-ref-parser');

module.exports = OpenApiMiddleware;

function OpenApiMiddleware(schema, options) {

    // set option defaults
    if (!options) options = {};
    if (!options.hasOwnProperty('controllers')) options.controllers = process.cwd();
    if (!options.hasOwnProperty('dereference')) options.dereference = schema => RefParser.dereference(schema);
    if (!options.hasOwnProperty('development')) options.development = process.env.NODE_ENV !== 'production';
    if (!options.hasOwnProperty('reqProperty')) options.reqProperty = 'openapi';
    if (!options.hasOwnProperty('xController')) options.xController = 'x-controller';
    if (!options.hasOwnProperty('xOperation')) options.xOperation = 'x-operation';

    // validate options
    if (typeof options.controllers !== 'string') throw Error('Configuration option "controllers" must be a string. Received: ' + options.controllers);
    if (typeof options.dereference !== 'function') throw Error('Configuration option "dereference" must be a function. Received: ' + options.dereference);
    if (typeof options.reqProperty !== 'string') throw Error('Configuration option "reqProperty" must be a string. Received: ' + options.reqProperty);
    if (typeof options.xController !== 'string') throw Error('Configuration option "xController" must be a string. Received: ' + options.xController);
    if (typeof options.xOperation !== 'string') throw Error('Configuration option "xOperation" must be a string. Received: ' + options.xOperation);

    const definition = options.dereference(schema)
        .then(schema => {

            // TODO: validate examples

            ///////////////////////////////////////////////////////////////
            //                                                           //
            //  Replace x-controllers in schema with actual controllers  //
            //                                                           //
            ///////////////////////////////////////////////////////////////

            const errors = [];
            const load = loadController.bind(context, errors, options.controllers);

            load(schema);
            if (schema.paths) {
                Object.keys(schema.paths).forEach(pathSchema => {
                    load(pathSchema);
                    Object.keys(pathSchema).forEach(load);
                });
            }

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

            return schema;
        });

    this._ = {
        controllers: {},
        definition: definition,
        enforcer: definition.then(schema => new Enforcer(schema, options.enforcer || {})),
        reqProperty: options.reqProperty,
        xController: options.xController,
        xOperation: options.xOperation
    }
}

/**
 * Execute a controller operation based on the request and its matching path schema.
 * To avoid response validation use res.write and res.end (res.send will be validated).
 * @returns {function}
 */
OpenApiMiddleware.prototype.controllers = function() {
    const context = this;
    const name = context._.reqProperty;
    const xController = context._.xController;
    const xOperation = context._.xOperation;

    return (req, res, next) => {
        const promise = req[name] ? Promise.resolve() : parse(context, req);

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
            .then(() => {
                const openapi = req[name];
                const methodSchema = openapi.pathSchema[req.method.toLowerCase()];

                // get the correct controller
                const controller = methodSchema[xController] ||
                    openapi.pathSchema[xController] || openapi.schema[xController];

                // if the controller doesn't exist then next
                if (!controller) {
                    debug('controller does not exist for path: ' + openapi.requestPath);
                    return next();
                }

                // get path operation and if it doesn't exist then next
                const operationId = methodSchema[xOperation] || methodSchema.operationId;
                if (!operationId) {
                    debug('operationId or ' + xOperation + ' not specified for path: ' + openapi.requestPath);
                    return next();
                }
                if (typeof controller[operationId] !== 'function') {
                    debug('operation ' + operationId + ' not found in controller for path: ' + openapi.requestPath);
                    return next();
                }

                // execute the controller
                return controller[operationId](req, res, beforeNext);
            })
            .catch(beforeNext);
    };
};

/**
 * Send standard error messages
 * @returns {function(*=, *, *, *)}
 */
OpenApiMiddleware.prototype.error = function() {
    return (err, req, res, next) => {
        if (err.code === OpenApiMiddleware.EREQUEST) {
            res.status(err.statusCode).send(err.message);
        } else if (err.code === OpenApiMiddleware.ERESPONSE) {
            console.error(err.stack);
            res.sendStatus(500);
        } else {
            next(err);
        }
    }
};

/**
 * Produce a mock response
 * @param config
 * @returns {function(*, *, *)}
 */
OpenApiMiddleware.prototype.mocks = function(config) {
    return (req, res, next) => {

    };
};

/**
 * Parse the request and create the openapi object on the request before calling next.
 * @returns {function}
 */
OpenApiMiddleware.prototype.parse = function() {
    const context = this;
    return (req, res, next) => {
        parse(context, req, res).then(next, next);
    };
};

Object.defineProperties(OpenApiMiddleware, {
    EREQUEST: { value: 'EREQ_OPENAPI_ENFORCER_MIDDLEWARE' },
    ERESPONSE: { value: 'ERES_OPENAPI_ENFORCER_MIDDLEWARE' }
});


function parse(context, req) {
    const dereference = context._.dereference;
    const name = context._.reqProperty;
    return dereference
        .then(enforcer => {

            const parsed = enforcer.request({
                body: req.body,
                cookie: req.cookies,
                header: req.headers,
                method: req.method,
                path: req.originalUrl.substr(req.baseUrl.length)
            });

            if (parsed.errors) {
                const err = Error(parsed.errors.join('\n'));
                err.statusCode = parsed.statusCode;
                err.code = OpenApiMiddleware.EREQUEST;
                throw err;

            } else {
                const p = parsed.value;
                req.body = p.body;
                Object.assign(req.cookies || {}, p.cookie);
                Object.assign(req.headers, p.header);
                Object.assign(req.params, p.path);
                Object.assign(req.query, p.query);

                // create the openapi request property
                if (!req[name]) req[name] = {};
                const openapi = req[name];
                openapi.enforcer = enforcer;
                openapi.path = parsed.path;
                openapi.pathSchema = parsed.schema;
                openapi.schema = enforcer.schema();
            }
        });
}

// replace schema x-controller string with required controller objects
function loadController(errors, basePath, schema) {
    const xController = this._.xController;
    const name = schema[xController];
    if (!name || typeof name !== 'string') return;

    const controllerPath = path.resolve(basePath, name);
    try {
        schema[xController] = require(controllerPath);
    } catch (err) {
        schema[xController] = null;
        errors.push(err);
    }
}