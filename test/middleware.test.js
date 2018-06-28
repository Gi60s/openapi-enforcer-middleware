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

    describe('options', () => {

        describe('404 fallthrough', () => {

            it('fallthrough enabled calls next middleware', () => {
                const flow = [];

                const app = express();
                const mw = openapi(schema, { fallthrough: true }) ;

                app.use(mw);

                app.use((req, res, next) => {
                    flow.push(1);
                    next();
                });

                app.use((err, req, res, next) => {
                    flow.push(2);
                    next();
                });

                return server.one(app, { uri: '/dne' })
                    .then(() => {
                        expect(flow).to.deep.equal([1]);
                    });
            });

            it('fallthrough disabled does not call next middleware', () => {
                const flow = [];

                const app = express();
                const mw = openapi(schema, { fallthrough: false }) ;

                app.use(mw);

                app.use((req, res, next) => {
                    flow.push(1);
                    next();
                });

                app.use((err, req, res, next) => {
                    flow.push(2);
                    next();
                });

                return server.one(app, { uri: '/dne' })
                    .then(res => {
                        expect(res.statusCode).to.equal(404);
                        expect(flow).to.deep.equal([]);
                    });
            });

            describe('manual fallthrough for client errors', () => {
                let api;

                before(() => {
                    const app = express();

                    const mw = openapi(schema, { fallthrough: false, mockFallback: false, development: false }) ;
                    app.use(mw);

                    mw.use((req, res, next) => {
                        if (req.url === '/people') return res.send('this is an invalid response');
                        if (req.url === '/people?classification=hero') throw Error('an error');
                        next();
                    })

                    mw.use((err, req, res, next) => {
                        const code = err.meta && err.meta.statusCode
                        if (code >= 400 && code < 500) {
                            next();
                        } else {
                            res.sendStatus(err.statusCode);
                        }
                    });

                    app.use((req, res, next) => {
                        res.send('fell through');
                    })

                    return server(app).then(instance => api = instance);
                });

                after(() => api.stop());

                it('404', () => {
                    return api.request({ uri: '/dne' })
                        .then(res => {
                            expect(res.statusCode).to.equal(200);
                            expect(res.body).to.equal('fell through');
                        });
                });

                it('400', () => {
                    return api.request({ uri: '/people?classification=dne' })
                        .then(res => {
                            expect(res.statusCode).to.equal(200);
                            expect(res.body).to.equal('fell through');
                        });
                });

                it('500 invalid response', () => {
                    return api.request({ uri: '/people' })
                        .then(res => {
                            expect(res.statusCode).to.equal(500);
                            console.log(res.body);
                            expect(res.body).to.equal('Internal Server Error');
                        });
                });

                it('500 thrown error', () => {
                    return api.request({ uri: '/people?classification=hero' })
                        .then(res => {
                            expect(res.statusCode).to.equal(500);
                            console.log(res.body);
                            expect(res.body).to.equal('Internal Server Error');
                        });
                });
            });
        });

        describe('mockEnabled', () => {

            describe('defaults', () => {

                it('not enabled without controllers', () => {
                    const app = express();
                    const mw = openapi(schema, { mockFallback: false }) ;
                    app.use(mw);

                    return server.one(app, { uri: '/people', headers: { 'x-mock': '' }})
                        .then(res => {
                            expect(res.statusCode).to.equal(404);
                        })
                })

                it('enabled with controllers', () => {
                    process.env.NODE_ENV = 'development';
                    const app = express();
                    const mw = openapi(schema, { controllers: './dne', mockFallback: false }) ;
                    app.use(mw);

                    return server.one(app, { uri: '/people', headers: { 'x-mock': '' }})
                        .then(res => {
                            expect(res.headers['x-openapi-enforcer']).to.match(/requested mock/);
                            expect(res.statusCode).to.equal(200);
                        })
                })
            })

            it('disabled', () => {
                const app = express();
                const mw = openapi(schema, { mockEnabled: false, mockFallback: false }) ;
                app.use(mw);

                return server.one(app, { uri: '/people', headers: { 'x-mock': '' }})
                    .then(res => {
                        expect(res.statusCode).to.equal(404);
                    })
            })

            it('enabled', () => {
                process.env.NODE_ENV = 'development';
                const app = express();
                const mw = openapi(schema, { mockEnabled: true, mockFallback: false }) ;
                app.use(mw);

                return server.one(app, { uri: '/people', headers: { 'x-mock': '' }})
                    .then(res => {
                        expect(res.headers['x-openapi-enforcer']).to.match(/requested mock/);
                        expect(res.statusCode).to.equal(200);
                    })
            })



        })

        describe('mockFallback', () => {

            it('disabled', () => {
                const app = express();
                const mw = openapi(schema, { mockFallback: false }) ;
                app.use(mw);

                return server.one(app, { uri: '/people' })
                    .then(res => {
                        expect(res.statusCode).to.equal(404);
                    })
            })

            it('enabled', () => {
                process.env.NODE_ENV = 'development';
                const app = express();
                const mw = openapi(schema, { mockFallback: true }) ;
                app.use(mw);

                return server.one(app, { uri: '/people' })
                    .then(res => {
                        expect(res.headers['x-openapi-enforcer']).to.match(/automatic mock/);
                        expect(res.statusCode).to.equal(200);
                    })
            })

        })

    })

    describe('internal flow', () => {
        let app, mw;

        beforeEach(() => {
            app = express();
            mw = openapi(schema);
            app.use(mw);
        })

        it('next() call next middleware', () => {
            const flow = [];

            mw.use((req, res, next) => {
                flow.push(1);
                next();
            })

            mw.use((error, req, res, next) => {
                flow.push(2);
                next();
            })

            mw.use((req, res, next) => {
                flow.push(3);
                next();
            })

            return server.one(app, { uri: '/dne' })
                .then(() => {
                    expect(flow).to.deep.equal([1,3]);
                });
        });

        it('next(err) call next error middleware', () => {
            const flow = [];

            mw.use((req, res, next) => {
                flow.push(1);
                next(Error('error'));
            })

            mw.use((req, res, next) => {
                flow.push(2);
                next();
            })

            mw.use((error, req, res, next) => {
                flow.push(3);
                next();
            })

            mw.use((req, res, next) => {
                flow.push(4);
                next();
            })

            return server.one(app, { uri: '/dne' })
                .then(() => {
                    expect(flow).to.deep.equal([1,3,4]);
                });
        });

        it('thrown error calls next error middleware', () => {
            const flow = [];

            mw.use((req, res, next) => {
                flow.push(1);
                throw Error('error');
            })

            mw.use((req, res, next) => {
                flow.push(2);
                next();
            })

            mw.use((error, req, res, next) => {
                flow.push(3);
                next();
            })

            mw.use((req, res, next) => {
                flow.push(4);
                next();
            })

            return server.one(app, { uri: '/dne' })
                .then(() => {
                    expect(flow).to.deep.equal([1,3,4]);
                });
        });

    })

});