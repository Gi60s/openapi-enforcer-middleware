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

describe.only('middleware', () => {
    const schema = __dirname + '/resources/v2.yaml';

    describe('400', () => {

        it('hits internal middleware', () => {
            const flow = [];
            const app = express();
            let error;

            const mw = openapi(schema);
            mw.use((req, res, next) => { flow.push('internal ok'); next(); });
            mw.use((err, req, res, next) => {
                error = err;
                flow.push('internal error');
                next();
            });

            app.use(mw);
            app.use((req, res, next) => { flow.push('external ok'); next(); });
            app.use((err, req, res, next) => { flow.push('external error'); next(); });

            return server.one(app, { uri: '/people?classification=dne' })
                .then(res => {
                    expect(flow).to.deep.equal(['internal error', 'external ok']);
                    expect(error).to.match(/query parameter/i);
                    expect(res.headers['x-openapi-enforcer']).to.equal('fallthrough');
                });
        });

        it('sends 400 internally', () => {
            const flow = [];
            const app = express();
            let error;

            const mw = openapi(schema);
            app.use(mw);
            app.use((req, res, next) => { flow.push('external ok'); next(); });
            app.use((err, req, res, next) => { flow.push('external error'); next(); });

            return server.one(app, { uri: '/people?classification=dne' })
                .then(res => {
                    expect(res.body).to.match(/query parameter/i);
                    expect(res.statusCode).to.equal(400);
                    expect(res.headers['x-openapi-enforcer']).to.equal('exception');
                });
        })

    });

    describe('404', () => {

        it('fallthrough skips internal middleware', () => {
            const flow = [];
            const app = express();

            const mw = openapi(schema, { fallthrough: true });
            mw.use((req, res, next) => { flow.push('internal ok'); next(); });
            mw.use((err, req, res, next) => { flow.push('internal error'); next(); });

            app.use(mw);
            app.use((req, res, next) => { flow.push('external ok'); next(); });

            return server.one(app, { uri: '/dne' })
                .then(res => {
                    expect(flow).to.deep.equal(['external ok']);
                    expect(res.statusCode).to.equal(404);
                    expect(res.body).to.match(/<title>Error<\/title>/);   // express' standard 404 response body
                    expect(res.headers['x-openapi-enforcer']).to.equal('fallthrough');
                });
        });

        describe('w/o fallthrough handles internally', () => {

            it('hits internal error middleware', () => {
                const flow = [];
                const app = express();
                let error;

                const mw = openapi(schema, { fallthrough: false });
                mw.use((req, res, next) => { flow.push('internal ok'); next(); });
                mw.use((err, req, res, next) => {
                    error = err;
                    flow.push('internal error');
                    next();
                });

                app.use(mw);
                app.use((req, res, next) => { flow.push('external ok'); next(); });
                app.use((err, req, res, next) => { flow.push('external error'); next(); });

                return server.one(app, { uri: '/dne' })
                    .then(res => {
                        expect(flow).to.deep.equal(['internal error', 'external ok']);
                        expect(error).to.match(/path not found/i);
                        expect(res.headers['x-openapi-enforcer']).to.equal('fallthrough');
                    });
            });

            it('sends 404 internally', () => {
                const flow = [];
                const app = express();
                let error;

                const mw = openapi(schema, { fallthrough: false });

                app.use(mw);
                app.use((req, res, next) => { flow.push('external ok'); next(); });
                app.use((err, req, res, next) => { flow.push('external error'); next(); });

                return server.one(app, { uri: '/dne' })
                    .then(res => {
                        expect(flow).to.deep.equal([]);
                        expect(res.statusCode).to.equal(404);
                        expect(res.body).to.match(/path not found/i);
                        expect(res.headers['x-openapi-enforcer']).to.equal('exception'); // internal sent message
                    });
            });
        })

    });

    describe('405', () => {

        it('hits internal error middleware', () => {
            const flow = [];
            const app = express();
            let error;

            const mw = openapi(schema);
            mw.use((req, res, next) => { flow.push('internal ok'); next(); });
            mw.use((err, req, res, next) => {
                error = err;
                flow.push('internal error');
                next();
            });

            app.use(mw);
            app.use((req, res, next) => { flow.push('external ok'); next(); });
            app.use((err, req, res, next) => { flow.push('external error'); next(); });

            return server.one(app, { uri: '/people', method: 'delete' })
                .then(res => {
                    expect(flow).to.deep.equal(['internal error', 'external ok']);
                    expect(error).to.match(/method not allowed/i);
                    expect(res.headers['x-openapi-enforcer']).to.equal('fallthrough'); // internal middleware passed it along
                });
        });

        it('sends 405 internally', () => {
            const flow = [];
            const app = express();
            let error;

            const mw = openapi(schema);
            app.use(mw);
            app.use((req, res, next) => { flow.push('external ok'); next(); });
            app.use((err, req, res, next) => { flow.push('external error'); next(); });

            return server.one(app, { uri: '/people', method: 'delete' })
                .then(res => {
                    expect(flow).to.deep.equal([]);
                    expect(res.statusCode).to.equal(405);
                    expect(res.body).to.match(/method not allowed/i);
                    expect(res.headers['x-openapi-enforcer']).to.equal('exception');    // internal sent message
                });
        });

    });

    describe('500', () => {
        const options = { fallthrough: false, mockFallback: false, development: false };

        describe('send invalid response', () => {

            it.only('hits internal error middleware', () => {
                const flow = [];
                const app = express();
                let error;

                const mw = openapi(schema, options);
                mw.use((req, res, next) => {
                    flow.push('internal ok');
                    res.send('this is an invalid response');
                });
                mw.use((err, req, res, next) => {
                    error = err;
                    flow.push('internal error');
                    next();
                });

                app.use(mw);
                app.use((req, res, next) => { flow.push('external ok'); next(); });
                app.use((err, req, res, next) => { flow.push('external error'); next(); });

                return server.one(app, { uri: '/people' })
                    .then(res => {
                        expect(flow).to.deep.equal(['internal ok', 'internal error', 'external ok']);
                        expect(error).to.match(/method not allowed/i);
                        expect(res.headers['x-openapi-enforcer']).to.equal('fallthrough'); // internal middleware passed it along
                    });
            });

            it('sends 500 internally', () => {
                const flow = [];
                const app = express();

                const mw = openapi(schema, options);
                mw.use((req, res, next) => {
                    flow.push('internal ok');
                    res.send('this is an invalid response');
                });
                mw.use((err, req, res, next) => {
                    error = err;
                    flow.push('internal error');
                    next();
                });

                app.use(mw);
                app.use((req, res, next) => { flow.push('external ok'); next(); });
                app.use((err, req, res, next) => { flow.push('external error'); next(); });

                return server.one(app, { uri: '/people' })
                    .then(res => {
                        expect(flow).to.deep.equal(['internal ok', 'internal error', 'external ok']);
                        expect(error).to.match(/method not allowed/i);
                        expect(res.headers['x-openapi-enforcer']).to.equal('fallthrough'); // internal middleware passed it along
                    });
            });

        });

        describe('thrown error', () => {

        });

    });

    // describe.skip('options', () => {
    //
    //     describe('404 fallthrough', () => {
    //
    //         it('fallthrough enabled calls next middleware', () => {
    //             const flow = [];
    //
    //             const app = express();
    //             const mw = openapi(schema, { fallthrough: true }) ;
    //
    //             app.use(mw);
    //
    //             app.use((req, res, next) => {
    //                 flow.push(1);
    //                 next();
    //             });
    //
    //             app.use((err, req, res, next) => {
    //                 flow.push(2);
    //                 next();
    //             });
    //
    //             return server.one(app, { uri: '/dne' })
    //                 .then(() => {
    //                     expect(flow).to.deep.equal([1]);
    //                 });
    //         });
    //
    //         it('fallthrough disabled does not call next middleware', () => {
    //             const flow = [];
    //
    //             const app = express();
    //             const mw = openapi(schema, { fallthrough: false }) ;
    //
    //             app.use(mw);
    //
    //             app.use((req, res, next) => {
    //                 flow.push(1);
    //                 next();
    //             });
    //
    //             app.use((err, req, res, next) => {
    //                 flow.push(2);
    //                 next();
    //             });
    //
    //             return server.one(app, { uri: '/dne' })
    //                 .then(res => {
    //                     expect(res.statusCode).to.equal(404);
    //                     expect(flow).to.deep.equal([]);
    //                 });
    //         });
    //
    //         describe('client errors', () => {
    //             let api;
    //
    //             before(() => {
    //                 const app = express();
    //
    //                 const mw = openapi(schema, { fallthrough: false, mockFallback: false, development: false }) ;
    //                 app.use(mw);
    //
    //                 mw.use((req, res, next) => {
    //                     if (req.url === '/people') return res.send('this is an invalid response');
    //                     if (req.url === '/people?classification=hero') throw Error('an error');
    //                     next();
    //                 })
    //
    //                 mw.use((err, req, res, next) => {
    //                     const code = err.meta && err.meta.statusCode
    //                     if (code >= 400 && code < 500) {
    //                         next();
    //                     } else {
    //                         res.sendStatus(err.statusCode);
    //                     }
    //                 });
    //
    //                 app.use((req, res, next) => {
    //                     res.send('fell through');
    //                 })
    //
    //                 return server(app).then(instance => api = instance);
    //             });
    //
    //             after(() => api.stop());
    //
    //             it.only('404', () => {
    //                 return api.request({ uri: '/dne' })
    //                     .then(res => {
    //                         expect(res.statusCode).to.equal(200);
    //                         expect(res.body).to.equal('fell through');
    //                     });
    //             });
    //
    //             it('400', () => {
    //                 return api.request({ uri: '/people?classification=dne' })
    //                     .then(res => {
    //                         expect(res.statusCode).to.equal(200);
    //                         expect(res.body).to.equal('fell through');
    //                     });
    //             });
    //
    //             it.only('500 invalid response', () => {
    //                 return api.request({ uri: '/people' })
    //                     .then(res => {
    //                         expect(res.statusCode).to.equal(500);
    //                         console.log(res.body);
    //                         expect(res.body).to.equal('Internal Server Error');
    //                     });
    //             });
    //
    //             it('500 thrown error', () => {
    //                 return api.request({ uri: '/people?classification=hero' })
    //                     .then(res => {
    //                         expect(res.statusCode).to.equal(500);
    //                         console.log(res.body);
    //                         expect(res.body).to.equal('Internal Server Error');
    //                     });
    //             });
    //         });
    //     });
    //
    //     describe('mockEnabled', () => {
    //
    //         describe('defaults', () => {
    //
    //             it('not enabled without controllers', () => {
    //                 const app = express();
    //                 const mw = openapi(schema, { mockFallback: false }) ;
    //                 app.use(mw);
    //
    //                 return server.one(app, { uri: '/people', headers: { 'x-mock': '' }})
    //                     .then(res => {
    //                         expect(res.statusCode).to.equal(404);
    //                     })
    //             })
    //
    //             it('enabled with controllers', () => {
    //                 process.env.NODE_ENV = 'development';
    //                 const app = express();
    //                 const mw = openapi(schema, { controllers: './dne', mockFallback: false }) ;
    //                 app.use(mw);
    //
    //                 return server.one(app, { uri: '/people', headers: { 'x-mock': '' }})
    //                     .then(res => {
    //                         expect(res.headers['x-openapi-enforcer']).to.match(/requested mock/);
    //                         expect(res.statusCode).to.equal(200);
    //                     })
    //             })
    //         })
    //
    //         it('disabled', () => {
    //             const app = express();
    //             const mw = openapi(schema, { mockEnabled: false, mockFallback: false }) ;
    //             app.use(mw);
    //
    //             return server.one(app, { uri: '/people', headers: { 'x-mock': '' }})
    //                 .then(res => {
    //                     expect(res.statusCode).to.equal(404);
    //                 })
    //         })
    //
    //         it('enabled', () => {
    //             process.env.NODE_ENV = 'development';
    //             const app = express();
    //             const mw = openapi(schema, { mockEnabled: true, mockFallback: false }) ;
    //             app.use(mw);
    //
    //             return server.one(app, { uri: '/people', headers: { 'x-mock': '' }})
    //                 .then(res => {
    //                     expect(res.headers['x-openapi-enforcer']).to.match(/requested mock/);
    //                     expect(res.statusCode).to.equal(200);
    //                 })
    //         })
    //
    //
    //
    //     })
    //
    //     describe('mockFallback', () => {
    //
    //         it('disabled', () => {
    //             const app = express();
    //             const mw = openapi(schema, { mockFallback: false }) ;
    //             app.use(mw);
    //
    //             return server.one(app, { uri: '/people' })
    //                 .then(res => {
    //                     expect(res.statusCode).to.equal(404);
    //                 })
    //         })
    //
    //         it('enabled', () => {
    //             process.env.NODE_ENV = 'development';
    //             const app = express();
    //             const mw = openapi(schema, { mockFallback: true }) ;
    //             app.use(mw);
    //
    //             return server.one(app, { uri: '/people' })
    //                 .then(res => {
    //                     expect(res.headers['x-openapi-enforcer']).to.match(/automatic mock/);
    //                     expect(res.statusCode).to.equal(200);
    //                 })
    //         })
    //
    //     })
    //
    // })
    //
    // describe.skip('internal flow', () => {
    //     let app, mw;
    //
    //     beforeEach(() => {
    //         app = express();
    //         mw = openapi(schema);
    //         app.use(mw);
    //     })
    //
    //     it('next() call next middleware', () => {
    //         const flow = [];
    //
    //         mw.use((req, res, next) => {
    //             flow.push(1);
    //             next();
    //         })
    //
    //         mw.use((error, req, res, next) => {
    //             flow.push(2);
    //             next();
    //         })
    //
    //         mw.use((req, res, next) => {
    //             flow.push(3);
    //             next();
    //         })
    //
    //         return server.one(app, { uri: '/dne' })
    //             .then(() => {
    //                 expect(flow).to.deep.equal([1,3]);
    //             });
    //     });
    //
    //     it('next(err) call next error middleware', () => {
    //         const flow = [];
    //
    //         mw.use((req, res, next) => {
    //             flow.push(1);
    //             next(Error('error'));
    //         })
    //
    //         mw.use((req, res, next) => {
    //             flow.push(2);
    //             next();
    //         })
    //
    //         mw.use((error, req, res, next) => {
    //             flow.push(3);
    //             next();
    //         })
    //
    //         mw.use((req, res, next) => {
    //             flow.push(4);
    //             next();
    //         })
    //
    //         return server.one(app, { uri: '/dne' })
    //             .then(() => {
    //                 expect(flow).to.deep.equal([1,3,4]);
    //             });
    //     });
    //
    //     it('thrown error calls next error middleware', () => {
    //         const flow = [];
    //
    //         mw.use((req, res, next) => {
    //             flow.push(1);
    //             throw Error('error');
    //         })
    //
    //         mw.use((req, res, next) => {
    //             flow.push(2);
    //             next();
    //         })
    //
    //         mw.use((error, req, res, next) => {
    //             flow.push(3);
    //             next();
    //         })
    //
    //         mw.use((req, res, next) => {
    //             flow.push(4);
    //             next();
    //         })
    //
    //         return server.one(app, { uri: '/dne' })
    //             .then(() => {
    //                 expect(flow).to.deep.equal([1,3,4]);
    //             });
    //     });
    //
    // })

});