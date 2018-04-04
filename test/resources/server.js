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
const openapi       = require('../../index');
const request       = require('request-promise-native');

module.exports = server;

function server(schema, options) {
    return new Promise((resolve, reject) => {

        const app = express();

        app.use(openapi(schema, options));

        app.use((req, res) => {
            res.json({
                body: req.body,
                cookies: req.cookies,
                headers: req.headers,
                params: req.params,
                query: req.query
            });
        });

        const listener = app.listen(err => {
            if (err) return reject(err);

            const result = {
                port: listener.address().port,

                request: function(options) {
                    const defaults = {
                        baseUrl: 'http://localhost:' + result.port,
                        resolveWithFullResponse: true,
                        simple: false,
                        json: true
                    };
                    const config = Object.assign(defaults, options);
                    console.log('Request: ' + JSON.stringify(config));
                    return request(config);
                },

                stop: () => new Promise((resolve, reject) => {
                    listener.close(err => {
                        if (err) return reject(err);
                        resolve();
                    });
                })
            };

            console.log('Test server started on port ' + result.port);
            resolve(result);
        });

    });
}

// start a server, make a request, end the server
server.one = function(request, schema, options) {
    let _api;
    let _data;
    return server(schema, options)
        .then(api => {
            _api = api;
            return api.request(request);
        })
        .then(data => {
            _data = data;
            return _api.stop();
        })
        .then(() => _data);
};