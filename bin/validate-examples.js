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

/**
 * Validate examples against their schemas.
 * @param {object} enforcer The enforcer object.
 * @param {object} schema A dereferenced schema.
 * @returns {array[]} An array of error messages.
 */
module.exports = function(enforcer, schema) {
    const results = [];

    getExamplesAndSchemas([], new Map(), '/root', schema)
        .forEach(data => {
            const deserialized = enforcer.deserialize(data.schema, data.example);
            const errors = deserialized.errors || enforcer.errors(data.schema, deserialized.value);
            if (errors) {
                results.push('WARNING: Errors with example at: ' + data.path + ':\n  ' + errors.join('\n  '));
            }
        });


    return results;
};

function getExamplesAndSchemas(results, map, path, obj) {
    if (obj && typeof obj === 'object') {
        if (!map.has(obj)) {
            map.set(obj, true);

            if (obj.hasOwnProperty('schema')) {
                const schema = obj.schema;
                if (obj.hasOwnProperty('examples')) {
                    Object.keys(obj.examples)
                        .forEach(key => {
                            results.push({
                                example: obj.examples[key],
                                path: path + '/examples/' + key,
                                schema: schema
                            });
                        });
                }

                if (schema.hasOwnProperty('example')) {
                    results.push({
                        example: schema.example,
                        path: path + '/example',
                        schema: schema
                    });
                }
            }

            Object.keys(obj)
                .forEach(key => {
                    if (key !== 'example' && key !== 'examples') {
                        getExamplesAndSchemas(results, map, path + '/' + key, obj[key]);
                    }
                });
        }
    }

    return results;
}