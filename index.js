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
const Enforcer = require('../openapi-enforcer/index');  // require('openapi-enforcer');

module.exports = function(schema, options) {
    if (!options) options = {};
    if (!options.hasOwnProperty('development')) options.development = true;
    if (!options.hasOwnProperty('reqProperty')) options.reqProperty = 'openapi';
    if (!options.schema) throw Error('Missing required option: schema');

    const enforcer = new Enforcer(schema, options.enforcerOptions || {});
    const name = options.reqProperty;
    return function(req, res, next) {
        const path = enforcer.path(req.path);
        if (!path) return next();

        if (!req[name]) req[name] = {};

        const method = req.method.toLowerCase();
        if (path.schema[method]) {
            req.params = path.params;
            // TODO: parse body, headers, query string

            req[name].path = {
                params: path.params,
                schema: path.schema[method]
            };
        }

    };
};