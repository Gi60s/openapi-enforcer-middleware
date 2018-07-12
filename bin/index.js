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
const Enforcer              = require('openapi-enforcer');
const enforcerMiddleware    = require('./middleware');
const RefParser             = require('json-schema-ref-parser');
const validateExamples      = require('./validate-examples');


module.exports = OpenAPIEnforcerMiddleware;

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
    const middleware = enforcerMiddleware(options, promise);

    // add middlewares according to configuration options
    if (options.mockEnabled) middleware.use(middleware.mock({ automatic: false, controllers: options.mockControllers }));
    if (options.controllers) middleware.use(middleware.controllers({ controllers: options.controllers }));
    if (options.mockFallback) middleware.use(middleware.mock({ automatic: true, controllers: options.mockControllers }));

    return middleware;
}

OpenAPIEnforcerMiddleware.Enforcer = Enforcer;


function deepFreeze(value) {
    if (value && typeof value === 'object') {
        Object.freeze(value);
        Object.keys(value).forEach(key => deepFreeze(value[key]));
    }
    return value;
}