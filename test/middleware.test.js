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

describe('middleware', () => {
    const schema = __dirname + '/resources/v2.yaml';

    it('fall through to error middleware', () => {
        const flow = [];

        const app = express();
        const mw = openapi(schema, { fallthrough: false}) ;

        app.use(mw);

        app.use((req, res, next) => {
            flow.push(1);
            next();
        });

        app.use((err, req, res, next) => {
            flow.push(2);
            expect(err.code).to.equal(openapi.ERROR_CODE);
            expect(err.statusCode).to.equal(404);
            next();
        });

        return server.one(app, { uri: '/dne' })
            .then(() => {
                expect(flow).to.deep.equal([2]);
            });
    });

    it('fall through to own error middleware', () => {
        const flow = [];

        const app = express();
        const mw = openapi(schema, {}) ;

        mw.use((req, res, next) => {
            flow.push(1);
            next();
        });

        mw.use((req, res, next) => {
            flow.push(2);
            next();
        });

        mw.use((err, req, res, next) => {
            flow.push(3);
            next();
        });

        mw.use((req, res, next) => {
            flow.push(4);
            next();
        });

        app.use(mw);

        return server.one(app, { uri: '/dne' })
            .then(() => {
                expect(flow).to.deep.equal([1,2,4]);
            });
    });

    it('call next with error', () => {
        const flow = [];

        const app = express();
        const mw = openapi(schema, { fallthrough: false }) ;

        mw.use((err, req, res, next) => {
            flow.push(1);
            next();
        });

        mw.use((req, res, next) => {
            flow.push(2);
            next(Error('error'));
        });

        mw.use((req, res, next) => {
            flow.push(3);
            next();
        });

        mw.use((err, req, res, next) => {
            flow.push(4);
            next();
        });

        app.use(mw);

        return server.one(app, { uri: '/dne' })
            .then(() => {
                expect(flow).to.deep.equal([1,2,4]);
            });
    });

    it('flow skipped when controller responds', () => {
        const flow = [];

        const app = express();
        const mw = openapi(schema, { mockFallback: true });

        mw.use((err, req, res, next) => {
            flow.push(1);
            next();
        });

        mw.use((req, res, next) => {
            flow.push(2);
            next();
        });

        app.use(mw);

        return server.one(app, { uri: '/people' })
            .then(() => {
                expect(flow).to.deep.equal([]);
            });
    });

    it('can run middleware before controllers', () => {
        const flow = [];

        const app = express();
        const mw = openapi(schema, {});

        mw.use((req, res, next) => {
            flow.push(1);
            next();
        });

        mw.use(mw.controllers());

        mw.use((err, req, res, next) => {
            flow.push(2);
            next();
        });

        app.use(mw);

        return server.one(app, { uri: '/people' })
            .then(() => {
                expect(flow).to.deep.equal([1,2]);
            });
    });

});