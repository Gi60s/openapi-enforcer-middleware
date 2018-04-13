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
const expect        = require('chai').expect;
const server        = require('./resources/server');

describe.skip('v3', () => {
    const path = __dirname + '/resources/v3.yaml';
    let api;

    before(() => {
        return server(path, {})
            .then(instance => api = instance);
    });

    after(() => {
        return api.stop();
    });

    it('invalid path', () => {
        return api.request({ uri: '/dne' })
            .then(data => expect(data.statusCode).to.equal(404))
    });

    it('GET with no parameters', () => {
        return api.request({ uri: '/people' })
            .then(res => {
                expect(res.statusCode).to.equal(200);
                expect(res.body).to.be.an.instanceOf(Array);
            });
    });

    it('GET with string query parameter', () => {
        return api.request({ uri: '/people/?id=Bob' })
            .then(res => {
                expect(res.statusCode).to.equal(200);
                expect(res.body.query).to.deep.equal({ id: 'Bob' });
            })
    });

    it('GET with failed enum query parameter', () => {
        return api.request({ uri: '/people/?classification=mouse' })
            .then(res => {
                expect(res.statusCode).to.equal(400);
                expect(res.body).to.match(/did not meet enum requirements/);
            });
    });


});