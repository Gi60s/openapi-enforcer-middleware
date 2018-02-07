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
const express       = require('express');
const fs            = require('fs');
const middleware    = require('../../index');
const refParser     = require('json-schema-ref-parser');
const request       = require('request-promise-native');

module.exports = function(specFilePath, options) {
    return new Promise((resolve, reject) => {

        fs.readFile(specFilePath, 'utf8', (err, yaml) => {
            if (err) return reject(err);

            refParser.dereference(yaml, function(err, schema) {
                if (err) return reject(err);

                const app = express();

                app.use(middleware(schema, options));

                const listener = app.listen(err => {
                    if (err) return reject(err);

                    const result = {
                        port: listener.address().port,

                        request: function(options) {
                            return request(Object.assign({ baseUrl: 'http://localhost:' + result.port }, options));
                        },

                        stop: () => new Promise((resolve, reject) => {
                            listener.close(err => {
                                if (err) return reject(err);
                                resolve();
                            });
                        })
                    };
                    resolve(result);
                });
            });
        });
    });
};