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
 * @param {object} map An object to load with controller mappings.
 * @param {object} schema A dereferenced schema.
 * @param {object} options Options passed into middleware.
 * @returns {boolean} true if no errors, false otherwise
 */
module.exports = function(map, schema, options) {
    const dneControllers = {};
    const methods = ['get', 'post', 'put', 'delete', 'options', 'head', 'trace'];
    const xController = options.xController;
    const xOperation = options.xOperation;
    const rootController = schema && schema[xController];
    const controllersDirectory = options.controllers ? path.resolve(process.cwd(), options.controllers) : undefined;
    const mocksDirectory = options.mockControllers ? path.resolve(process.cwd(), options.mockControllers) : undefined;
    let errors = false;

    function load(directory, filename, operation) {
        const controllerPath = path.resolve(directory, filename);
        try {
            if (!dneControllers[controllerPath]) {
                const controller = require(controllerPath);
                const op = controller[operation];
                if (op) return controller[operation];

                console.log('Operation "' + operation + '" does not exist in controller: ' + controllerPath);
                errors = true;
            }

        } catch (err) {
            console.log('Unable to load controller: ' + controllerPath);
            dneControllers[controllerPath] = true
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

                const data = {};
                map[method + pathKey] = data;
                if (controllerName && operationName) {
                    if (controllersDirectory) data.controller = load(controllersDirectory, controllerName, operationName);
                    if (mocksDirectory) data.mock = load(mocksDirectory, controllerName, operationName);
                }
            });
        });
    }

    return errors;
};