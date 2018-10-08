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
const path = require('path');

/**
 * Map all controllers.
 * @param {object} schema A dereferenced schema.
 * @param {string} directory The directory to look for controllers in.
 * @param {Array} dependencyInjection Dependencies to inject into controllers that are functions.
 * @param {boolean} debug If specified use debug logging.
 * @param {object} options Options passed into middleware.
 * @param {string} options.xController
 * @param {boolean} options.development
 * @param {string} options.xOperation
 * @returns {boolean} true if no errors, false otherwise
 */
module.exports = function(schema, directory, dependencyInjection, debug, options) {
    const loadedControllers = {};
    const map = {};
    const methods = ['get', 'post', 'put', 'delete', 'options', 'head', 'trace'];
    const xController = options.xController;
    const xOperation = options.xOperation;
    const rootController = schema && schema[xController];
    const errController = debug ? 'mock controller' : 'controller'
    const errorPrefix = options.development ? 'WARNING' : 'ERROR';
    let errors = false;

    function load(directory, filename, operation, errLocation) {
        const controllerPath = path.resolve(directory, filename);
        try {
            if (!loadedControllers[controllerPath]) {
                let controller = require(controllerPath);
                if (typeof controller === 'function') controller = controller.apply(controller, dependencyInjection);
                loadedControllers[controllerPath] = controller;
            }
            const controller = loadedControllers[controllerPath];
            const op = controller[operation];
            if (op) return controller[operation];

            if (options.development) log(debug, errorPrefix + ': Operation "' + operation + '" does not exist in ' + errController + ' file "' + controllerPath + '" referenced by path: ' + errLocation);
            errors = true;

        } catch (err) {
            if (options.development) {
                log(debug, errorPrefix + ': Unable to load ' + errController + ' file "' + controllerPath + '" referenced by path: ' + errLocation);
                console.log(err.stack);
            }
            errors = true;
        }
    }

    if (schema) {
        Object.keys(schema.paths).forEach(pathKey => {
            const pathSchema = schema.paths[pathKey];
            const pathController = pathSchema[xController];

            methods.forEach(method => {
                const methodSchema = pathSchema && pathSchema[method];
                const methodController = methodSchema && methodSchema[xController];
                const controllerName = methodController || pathController || rootController;
                const operationName = methodSchema && (methodSchema[xOperation] || methodSchema.operationId);
                if (controllerName && operationName) {
                    map[method + pathKey] = load(directory, controllerName, operationName, method.toUpperCase() + ' ' + pathKey);
                }
            });
        });
    }

    if (errors && !options.development) throw Error('One or more errors encountered while loading controllers');

    return map;
};

function log(debug, message) {
    if (debug) {
        debug(message)
    } else {
        console.log(message)
    }
}