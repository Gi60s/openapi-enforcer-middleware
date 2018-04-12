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
const expect        = require('chai').expect;
const server        = require('./resources/server');
const openapi       = require('../index');

describe('v2', () => {
    const schema = __dirname + '/resources/v2.yaml';
    let api;

    function start(options) {
        const app = express();
        app.use(openapi(schema, options));
        return server(app).then(instance => api = instance);
    }

    function stop() {
        return api.stop();
    }

    describe('request validation', () => {

        before(() => start({ mockFallback: true }));
        after(() => stop());

        it('default path not found returns 404', () => {
            return api.request({ uri: '/dne' })
                .then(data => expect(data.statusCode).to.equal(404))
        });

        it('invalid request parameter value returns 400', () => {
            return api.request({ uri: '/people?classification=dne' })
                .then(data => expect(data.statusCode).to.equal(400))
        });

        it('invalid method returns 405', () => {
            return api.request({ uri: '/people', method: 'PUT' })
                .then(data => expect(data.statusCode).to.equal(405))
        });

        it('valid request', () => {
            return api.request({ uri: '/people' })
                .then(res => expect(res.statusCode).to.equal(200));
        });

    });

    describe('response validation', () => {

        it('custom valid function', () => {
            function valid(req, res, next) {
                res.send('Yep');
            }
            return server.one({ uri: '/people' }, schema, { valid })
                .then(data => {
                    expect(data.body).to.equal('Yep');
                });
        });

    });

});