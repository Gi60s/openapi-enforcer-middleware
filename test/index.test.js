/**
 *  @license
 *    Copyright 2019 Brigham Young University
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
'use strict'
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
// const Enforcer = require('../dist/index')
// const helper = require('./resources/helper')
// const path = require('path')
const Builder = require('../dist/doc-builder').default
const utils = require('../test-resources/test-utils')

const expect = chai.expect
chai.use(chaiAsPromised)

const Server = utils.server
const { copy, ok, spec, test } = utils



/* global describe it */
describe('openapi-enforcer-middleware', () => {

  describe('configuration', function () {
    it('middleware will use use sub path', async () => {
      const doc = spec.openapi([{
        path: '/foo'
      }])

      const { app, enforcerPromise, enforcerMiddleware, request, start, stop } = utils.server({ doc, initEnforcer: false })
      app.use('/api', enforcerMiddleware.init(enforcerPromise))

      app.get('/api/foo', (req, res) => {
        res.sendStatus(200)
      })

      // this path is not defined in the OpenAPI doc so it will never be reached with the default middleware options
      app.get('/api/bar', (req, res) => {
        res.sendStatus(200)
      })

      await start()

      // test the route defined by the OpenAPI doc and as an Express route
      let res = await request({ path: '/api/foo' })
      expect(res.statusCode).to.equal(200)

      // test the route NOT defined by the OpenAPI doc but only as an Express route
      res = await request({ path: '/api/bar' })
      expect(res.statusCode).to.equal(404)

      // test a route that wasn't defined at the Express route root but is defined at the OpenAPI document root
      res = await request({ path: '/foo' })
      expect(res.statusCode).to.equal(404)

      await stop()
    })
  })

  describe('options', () => {

    describe('allowOtherQueryParameters', () => {
      it('will not allow other query parameters by default', async function () {
        const doc = spec.openapi([{
          parameters: [{ name: 'x', in: 'query', schema: { type: 'string' } }]
        }])

        function routeHook (app) {
          app.get('/', ok())
        }

        await test({ doc, routeHook }, async (request) => {
          let res = await request({ path: '/?x=1' })
          expect(res.statusCode).to.equal(200)

          res = await request({ path: '/?y=1' })
          expect(res.statusCode).to.equal(400)
          expect(res.body).to.match(/unexpected parameter: y/i)
        })
      })

      it('will allow specifying specific additional query parameters', async function () {
        const doc = spec.openapi()

        function routeHook (app) {
          app.get('/', ok())
        }

        const initEnforcer = { allowOtherQueryParameters: ['foo'] }

        await test({ doc, routeHook, initEnforcer }, async (request) => {
          let res = await request({ path: '/?foo=1' })
          expect(res.statusCode).to.equal(200)

          res = await request({ path: '/?bar=1' })
          expect(res.statusCode).to.equal(400)
          expect(res.body).to.match(/unexpected parameter: bar/i)
        })
      })

      it('will allow specifying any additional query parameters', async function () {
        const doc = spec.openapi()

        function routeHook (app) {
          app.get('/', ok())
        }

        const initEnforcer = { allowOtherQueryParameters: true }

        await test({ doc, routeHook, initEnforcer }, async (request) => {
          let res = await request({ path: '/?foo=1' })
          expect(res.statusCode).to.equal(200)

          res = await request({ path: '/?bar=1' })
          expect(res.statusCode).to.equal(200)
        })
      })
    })

    describe('handleBadRequest', () => {
      it('will automatically handle bad requests by default', async () => {
        const doc = spec.openapi([{
          path: '/{num}',
          parameters: [{ name: 'num', in: 'path', required: true, schema: { type: 'number' } }],
        }])

        function routeHook (app) {
          app.get('/:num', ok())
        }

        await test({ doc, routeHook }, async (request) => {
          let res = await request({ path: '/123' })
          expect(res.statusCode).to.equal(200)

          res = await request({ path: '/hello' })
          expect(res.statusCode).to.equal(400)
          expect(res.body).to.match(/expected a number/i)
        })
      })


      it('can be configured to ignore bad requests', async () => {
        const doc = spec.openapi([{
          path: '/{num}',
          parameters: [{ name: 'num', in: 'path', required: true, schema: { type: 'number' } }],
        }])

        let visitedRoute = 0
        function routeHook (app) {
          app.get('/:num', (req, res) => {
            //expect(req.enforcer).to.be.undefined
            visitedRoute++
            res.sendStatus(200)
          })
        }

        const initEnforcer = { handleBadRequest: false }

        await test({ doc, routeHook, initEnforcer }, async (request) => {
          let res = await request({ path: '/123' })
          expect(res.statusCode).to.equal(200)

          res = await request({ path: '/hello' })
          expect(res.statusCode).to.equal(200)
        })

        expect(visitedRoute).to.equal(2)
      })
    })

    describe('handleNotFound', () => {

      it('will automatically handle 404 not found by default', async () => {
        const doc = spec.openapi([{ path: '/foo' }])

        function routeHook (app) {
          app.get('/bar', (req, res) => {
            res.sendStatus(200)
          })
        }

        await test({ doc, routeHook }, async (request) => {
          let res = await request({ path: '/bar' })
          expect(res.statusCode).to.equal(404)
        })
      })

      it('can be configured to ignore 404 not found', async () => {
        const doc = spec.openapi([{ path: '/foo' }])

        function routeHook (app) {
          app.get('/bar', (req, res) => {
            res.send('bar')
          })
        }

        const initEnforcer = { handleNotFound: false }

        await test({ doc, routeHook, initEnforcer }, async (request) => {
          let res = await request({ path: '/bar' })
          expect(res.statusCode).to.equal(200)
          expect(res.body).to.equal('bar')
        })
      })
    })

    describe('handleMethodNotAllowed', () => {
      function routeHook (app) {
        app.get('/', ok())

        app.put('/', (req, res) => {
          res.sendStatus(418)
        })
      }

      it('will automatically handle 405 method not allowed by default', async () => {
        const doc = spec.openapi()

        await test({ doc, routeHook }, async (request) => {
          // get method works
          let res = await request({ path: '/' })
          expect(res.statusCode).to.equal(200)

          // put method not defined in openapi spec
          res = await request({ method: 'put', path: '/' })
          expect(res.statusCode).to.equal(405)
        })
      })

      it('can be configured to ignore 405 method not allowed', async () => {
        const doc = spec.openapi()

        const initEnforcer = { handleMethodNotAllowed: false }

        await test({ doc, routeHook, initEnforcer }, async (request) => {
          let res = await request({ method: 'put', path: '/' })
          expect(res.statusCode).to.equal(418)
        })
      })
    })
  })

  describe('mocks', function () {
    it('allow mock header request by default', async () => {
      const doc = spec.openapi([{
        responses: [
          { code: 200, schema: { type: 'number', minimum: 0, maximum: 5 } }
        ]
      }])

      function routeHook (app) {
        app.get('/', (req, res) => {
          res.sendStatus(418)
        })
      }

      await test({ doc, routeHook }, async (request) => {
        // no mock request header and route implemented
        let res = await request({ path: '/' })
        expect(res.statusCode).to.equal(418)

        // mock request header so ignore implemented route
        res = await request({ path: '/', headers: { 'x-mock': '' } })
        expect(+res.body).to.be.at.least(0)
        expect(+res.body).to.be.at.most(5)
        expect(res.statusCode).to.equal(200)
      })
    })

    it('can disable mock header request', async () => {
      const doc = spec.openapi([{
        responses: [
          { code: 200, schema: { type: 'number', minimum: 0, maximum: 5 } }
        ]
      }])

      function routeHook (app) {
        app.get('/', (req, res) => {
          res.sendStatus(418)
        })
      }

      await test({ doc, routeHook, initEnforcer: { mockHeader: '' } }, async (request) => {
        // no mock request header and route implemented
        let res = await request({ path: '/', headers: { 'x-mock': 200 } })
        expect(res.statusCode).to.equal(418)

        // mock request header disabled
        res = await request({ path: '/', headers: { 'x-mock': 200 } })
        expect(res.statusCode).to.equal(418)
      })
    })

    it('allow mock query request by default', async () => {
      const doc = spec.openapi([{
        responses: [
          { code: 200, schema: { type: 'number', minimum: 0, maximum: 5 } }
        ]
      }])

      function routeHook (app) {
        app.get('/', (req, res) => {
          res.sendStatus(418)
        })
      }

      await test({ doc, routeHook }, async (request) => {
        // no mock request header and route implemented
        let res = await request({ path: '/' })
        expect(res.statusCode).to.equal(418)

        // mock request header so ignore impelemented route
        res = await request({ path: '/?x-mock' })
        expect(+res.body).to.be.at.least(0)
        expect(+res.body).to.be.at.most(5)
        expect(res.statusCode).to.equal(200)
      })
    })

    it('can disable mock query request', async () => {
      const doc = spec.openapi([{
        responses: [
          { code: 200, schema: { type: 'number', minimum: 0, maximum: 5 } }
        ]
      }])

      function routeHook (app) {
        app.get('/', (req, res) => {
          res.sendStatus(418)
        })
      }

      await test({ doc, routeHook, initEnforcer: { allowOtherQueryParameters: true, mockQuery: '' } }, async (request) => {
        // no mock request and route implemented
        let res = await request({ path: '/' })
        expect(res.statusCode).to.equal(418)

        // mock query request disabled
        res = await request({ path: '/?x-mock' })
        expect(res.statusCode).to.equal(418)
      })
    })

    describe.only('mock result priority', function () {
      let doc

      before(() => {
        doc = spec.openapi([{
          responses: [
            { code: 200, type: 'application/json', example: 1, schema: { type: 'integer' } },
            { code: 200, type: 'text/plain', examples: { hello: 'hello', bye: 'bye' }, schema: { type: 'string' } },
            { code: 201, type: 'application/json', example: true, schema: { type: 'boolean' } }
          ]
        }])
      })

      describe('will use 200 response code if none specified', () => {
        it('openapi v2', async () => {
          let doc = spec.swagger([{
            responses: [
              { code: 200, type: 'application/json', schema: { type: 'integer' } },
              { code: 201, type: 'application/json', schema: { type: 'boolean' } }
            ]
          }])
          await test({ doc }, async (request) => {
            let res = await request({ path: '/?x-mock' })
            expect(res.statusCode).to.equal(200)
          })
        })

        it('openapi v3', async () => {
          let doc = spec.openapi([{
            responses: [
              { code: 200, type: 'application/json', schema: { type: 'integer' } },
              { code: 201, type: 'application/json', schema: { type: 'boolean' } }
            ]
          }])
          await test({ doc }, async (request) => {
            let res = await request({ path: '/?x-mock' })
            expect(res.statusCode).to.equal(200)
          })
        })
      })

      describe('will use produce a random response body if no example(s) or implementation exists', () => {
        it('openapi v2', async () => {
          const doc = spec.swagger([{
            responses: [
              { code: 200, type: 'application/json', schema: { type: 'integer' } }
            ]
          }])
          await test({ doc }, async (request) => {
            let res = await request({ path: '/?x-mock' })
            expect(res.body).to.be.a('number')
            expect(res.body % 1).to.equal(0)
          })
        })

        it('openapi v3', async () => {
          const doc = spec.openapi([{
            responses: [
              { code: 200, type: 'application/json', schema: { type: 'integer' } }
            ]
          }])
          await test({ doc }, async (request) => {
            let res = await request({ path: '/?x-mock' })
            expect(res.body).to.be.a('number')
            expect(res.body % 1).to.equal(0)
          })
        })
      })

      describe('will use return a schema example if no implementation exists', function () {
        it('openapi v2', async () => {
          const doc = spec.swagger([{
            responses: [
              { code: 200, type: 'application/json', schema: { type: 'integer', example: 1 } }
            ]
          }])
          await test({ doc }, async (request) => {
            let res = await request({ path: '/?x-mock' })
            expect(res.body).to.equal(1)
          })
        })

        it('openapi v3', async () => {
          const doc = spec.openapi([{
            responses: [
              { code: 200, type: 'application/json', schema: { type: 'integer', example: 1 } }
            ]
          }])
          await test({ doc }, async (request) => {
            let res = await request({ path: '/?x-mock' })
            expect(res.body).to.equal(1)
          })
        })
      })

      describe('will use return a content example if no implementation exists', () => {
        it('openapi v3', async () => {
          const doc = spec.openapi([{
            responses: [
              { code: 200, type: 'application/json', example: 2, schema: { type: 'integer', example: 1 } }
            ]
          }])
          await test({ doc }, async (request) => {
            let res = await request({ path: '/?x-mock' })
            expect(res.body).to.equal(2)
          })
        })
      })

      it.only('will use implementation if it exists', async () => {
        const doc = spec.openapi([{
          responses: [
            { code: 200, type: 'application/json', example: 2, schema: { type: 'integer', example: 1 } }
          ]
        }])
        doc['x-mock-implemented'] = true

        function routeHook (app) {
          app.get('/', (req, res) => {
            if (req.enforcer.mockMode) {
              res.enforcer.send(5)
            } else {
              res.enforcer.send(6)
            }
          })
        }

        await test({ doc, routeHook }, async (request) => {
          let res = await request({ path: '/?x-mock' })
          expect(res.body).to.equal(5)

          res = await request({ path: '/' })
          expect(res.body).to.equal(6)
        })
      })

      it('can specify response code', async () => {
        await test({ doc }, async (request) => {
          // no mock request and route implemented
          let res = await request({ path: '/?x-mock=200' })
          expect(res.statusCode).to.equal(200)
          expect(res.body).to.be.oneOf([1, 'hello', 'bye'])

          // mock query request disabled
          res = await request({ path: '/?x-mock=201' })
          expect(res.statusCode).to.equal(201)
          expect(res.body).to.equal(true)
        })
      })

      it('can specify a response type', async () => {
        await test({ doc }, async (request) => {
          // no mock request and route implemented
          let res = await request({ path: '/?x-mock=200,random' })
          expect(res.statusCode).to.equal(200)
          expect(res.body).not.to.be.oneOf([1, 'hello', 'bye'])
        })
      })

      it('can specify a response example by name', async () => {
        await test({ doc }, async (request) => {
          // include mock request and route implemented
          let res = await request({ path: '/?x-mock=200,example,hello' })
          expect(res.statusCode).to.equal(200)
          expect(res.body).to.equal('hello')
        })
      })

    })
  })



  describe('response enforcer', () => {

    it('can validate bad responses and automatically send a 500 error', async () => {
      const doc = spec.openapi([{
        path: '/',
        parameters: [{ name: 'validate', in: 'query', schema: { type: 'boolean' } }],
        responses: [
          { code: 200, schema: { type: 'number' }}
        ]
      }])

      let caughtError = false
      function routeHook (app) {
        app.get('/', (req, res) => {
          const { validate } = req.enforcer.query
          if (validate) {
            res.enforcer.send(true)
          } else {
            res.send(true)
          }
        })

        app.use((err, req, res, next) => {
          caughtError = true
          res.sendStatus(418)
        })
      }

      await test({ doc, routeHook }, async (request) => {
        // non-validated response
        let res = await request({ path: '/?validate=false' })
        expect(res.statusCode).to.equal(200)
        expect(res.body).to.equal('true')

        // invalid validated response
        res = await request({ path: '/?validate=true' })
        expect(res.statusCode).to.equal(500)
        expect(res.body).to.match(/Internal server error/i)

        // invalid response not caught
        expect(caughtError).to.equal(false)
      })
    })

    it('can catch bad response if handleBadResponse is false', async () => {
      const doc = spec.openapi([{
        responses: [{ code: 200, schema: { type: 'number' }}]
      }])

      let caughtError = false
      function routeHook (app) {
        app.get('/', (req, res) => {
          res.enforcer.send('hello')
        })

        app.use((err, req, res, next) => {
          caughtError = true
          res.sendStatus(418)
        })
      }

      await test({ doc, routeHook, initEnforcer: { handleBadResponse: false } }, async (request) => {
        // invalid response validated and caught
        let res = await request({ path: '/' })
        expect(res.statusCode).to.equal(418)
        expect(caughtError).to.equal(true)
      })
    })
  })

  // describe('mocking', function () {
  //
  //   describe('mock requests', function () {
  //
  //   })
  //
  //   describe('fallback mocking', function () {
  //
  //   })
  //
  // })

  // TODO: test base path

  // describe('map controllers', () => {
  //   it('will produce exception for invalid controller target', () => {
  //     const definition = helper.definition.v3()
  //     definition['x-controller'] = 'dne'
  //     definition.paths['/'].get['x-operation'] = 'dne'
  //     const enforcer = Enforcer(definition)
  //     const promise = enforcer.controllers()
  //     return expect(promise).to.be.rejectedWith(/Controllers target must be a string, a non-null object, or a function that returns a non-null object/)
  //   })
  //
  //   it('will produce exception for missing controller file', () => {
  //     const definition = helper.definition.v3()
  //     definition['x-controller'] = 'dne'
  //     definition.paths['/'].get['x-operation'] = 'dne'
  //     const enforcer = Enforcer(definition)
  //     const promise = enforcer.controllers(path.resolve(__dirname, 'resources'))
  //     return expect(promise).to.be.rejectedWith(/at: dne\s+Cannot find module/)
  //   })
  //
  //   it('will produce exception for controller file that failed to be required', () => {
  //     const definition = helper.definition.v3()
  //     definition['x-controller'] = 'internal-error'
  //     definition.paths['/'].get['x-operation'] = 'x'
  //     const enforcer = Enforcer(definition)
  //     const promise = enforcer.controllers(path.resolve(__dirname, 'resources'))
  //     return expect(promise).to.be.rejectedWith(/Cannot find module/)
  //   })
  //
  //   it('will produce exception for missing operation', () => {
  //     const definition = helper.definition.v3()
  //     definition['x-controller'] = 'controller'
  //     definition.paths['/'].get['x-operation'] = 'dne'
  //     const enforcer = Enforcer(definition)
  //     const promise = enforcer.controllers(path.resolve(__dirname, 'resources'))
  //     return expect(promise).to.be.rejectedWith(/at: controller\s+Operation not found: dne/)
  //   })
  //
  //   it('will produce exception for missing mapped controller', () => {
  //     const definition = helper.definition.v3()
  //     definition['x-controller'] = 'dne'
  //     definition.paths['/'].get['x-operation'] = 'dne'
  //     const enforcer = Enforcer(definition)
  //     const promise = enforcer.controllers({})
  //     return expect(promise).to.be.rejectedWith(/at: dne\s+Controller not found/)
  //   })
  //
  //   it('will produce exception for missing operation of mapped controller', () => {
  //     const definition = helper.definition.v3()
  //     definition['x-controller'] = 'controller'
  //     definition.paths['/'].get['x-operation'] = 'dne'
  //     const enforcer = Enforcer(definition)
  //     const promise = enforcer.controllers({ controller: {} })
  //     return expect(promise).to.be.rejectedWith(/at: controller\s+Controller operation not found: dne/)
  //   })
  //
  //   it('will allow an operation to be a function', () => {
  //     const definition = helper.definition.v3()
  //     definition['x-controller'] = 'controller'
  //     definition.paths['/'].get['x-operation'] = 'empty'
  //     const enforcer = Enforcer(definition)
  //     const promise = enforcer.controllers({ controller: { empty: () => {} } })
  //     return expect(promise).to.eventually.be.a('Map')
  //   })
  //
  //   it('will allow an operation to be an array of functions', () => {
  //     const definition = helper.definition.v3()
  //     definition['x-controller'] = 'controller'
  //     definition.paths['/'].get['x-operation'] = 'empty'
  //     const enforcer = Enforcer(definition)
  //     const promise = enforcer.controllers({
  //       controller: {
  //         empty: [() => {}]
  //       }
  //     })
  //     return expect(promise).to.eventually.be.a('Map')
  //   })
  //
  //   it('will produce an exception if an operation is an array not of functions', () => {
  //     const definition = helper.definition.v3()
  //     definition['x-controller'] = 'controller'
  //     definition.paths['/'].get['x-operation'] = 'invalid'
  //     const enforcer = Enforcer(definition)
  //     const promise = enforcer.controllers({
  //       controller: {
  //         invalid: [1]
  //       }
  //     })
  //     return expect(promise).to.be.rejectedWith(/at: 0\s+Not a function/)
  //   })
  //
  //   it('will produce an exception if an operation is not a function', () => {
  //     const definition = helper.definition.v3()
  //     definition['x-controller'] = 'controller'
  //     definition.paths['/'].get['x-operation'] = 'invalid'
  //     const enforcer = Enforcer(definition)
  //     const promise = enforcer.controllers({
  //       controller: {
  //         invalid: 1
  //       }
  //     })
  //     return expect(promise).to.be.rejectedWith(/at: controller\s+Expected a function or an array of functions. Received: 1/)
  //   })
  //
  //   it('allows the controllers target to be a function', () => {
  //     const definition = helper.definition.v3()
  //     definition['x-controller'] = 'controller'
  //     definition.paths['/'].get['x-operation'] = 'empty'
  //     const enforcer = Enforcer(definition)
  //     const promise = enforcer.controllers(function () {
  //       return {
  //         controller: {
  //           empty: [() => {}]
  //         }
  //       }
  //     })
  //     return expect(promise).to.eventually.be.a('Map')
  //   })
  //
  //   it('throw an exception if the controllers target as a function does not return a non-null object', () => {
  //     const definition = helper.definition.v3()
  //     definition['x-controller'] = 'controller'
  //     definition.paths['/'].get['x-operation'] = 'empty'
  //     const enforcer = Enforcer(definition)
  //     const promise = enforcer.controllers(function () {
  //       return null
  //     })
  //     return expect(promise).to.be.rejectedWith(/Controllers target function must return a non-null object/)
  //   })
  //
  //   describe('dependency injection', () => {
  //     it('injects for controllers target as function', async () => {
  //       const injected = []
  //       function target (a, b, c) {
  //         injected.push(a, b, c)
  //         return {}
  //       }
  //       const enforcer = Enforcer(helper.definition.v3())
  //       await enforcer.controllers(target, 1, 2, 3)
  //       expect(injected).to.deep.equal([1, 2, 3])
  //     })
  //
  //     it('injects for controllers target as file path when controller file returns function', async () => {
  //       const definition = helper.definition.v3()
  //       definition['x-controller'] = 'injectable'
  //       definition.paths['/'].get['x-operation'] = 'injected'
  //       const enforcer = Enforcer(definition)
  //       enforcer.controllers(path.resolve(__dirname, 'resources'), 1, 'b', false)
  //       const { res } = await helper.request(enforcer, { json: true })
  //       expect(res.body).to.deep.equal([1, 'b', false])
  //     })
  //   })
  // })
  //
  // describe('run controllers', () => {
  //   it('thrown middleware errors are passed to existing internal error middleware', async () => {
  //     let handledError = false
  //     const definition = helper.definition.v3()
  //     definition['x-controller'] = 'hasError'
  //     definition.paths['/'].get['x-operation'] = 'hasError'
  //     definition.paths['/'].get.responses.default = { description: '' }
  //     const enforcer = Enforcer(definition)
  //     enforcer.controllers({
  //       hasError: {
  //         hasError (req, res) {
  //           const err = Error('Unexpected error')
  //           err.code = 'NOT_REALLY_UNEXPECTED'
  //           throw err
  //         }
  //       }
  //     })
  //     enforcer.use((err, req, res, next) => {
  //       if (err.code === 'NOT_REALLY_UNEXPECTED') handledError = true
  //       res.sendStatus(500)
  //     })
  //     const { res } = await helper.request(enforcer)
  //     expect(handledError).to.equal(true)
  //     expect(res.statusCode).to.equal(500)
  //   })
  //
  //   it('thrown middleware errors are passed to external error middleware', async () => {
  //     let handledError = false
  //     const definition = helper.definition.v3()
  //     definition['x-controller'] = 'hasError'
  //     definition.paths['/'].get['x-operation'] = 'hasError'
  //     definition.paths['/'].get.responses.default = { description: '' }
  //     const enforcer = Enforcer(definition)
  //     enforcer.controllers({
  //       hasError: {
  //         hasError (req, res) {
  //           const err = Error('Unexpected error')
  //           err.code = 'NOT_REALLY_UNEXPECTED'
  //           throw err
  //         }
  //       }
  //     })
  //
  //     const { app, request, start, stop } = helper.server()
  //     app.use(enforcer.middleware())
  //     app.use((err, req, res, next) => {
  //       if (err.code === 'NOT_REALLY_UNEXPECTED') handledError = true
  //       res.sendStatus(500)
  //     })
  //
  //     await start()
  //     try {
  //       await request(enforcer, { resolveWithFullResponse: true, simple: false })
  //     } catch (err) {
  //       console.error(err)
  //     }
  //     await stop()
  //     expect(handledError).to.equal(true)
  //   })
  //
  //   it('thrown async middleware errors are passed to external error middleware', async () => {
  //     let handledError = false
  //     const definition = helper.definition.v3()
  //     definition['x-controller'] = 'hasError'
  //     definition.paths['/'].get['x-operation'] = 'hasError'
  //     definition.paths['/'].get.responses.default = { description: '' }
  //     const enforcer = Enforcer(definition)
  //     enforcer.controllers({
  //       hasError: {
  //         hasError (req, res) {
  //           const err = Error('Unexpected async error')
  //           err.code = 'NOT_REALLY_UNEXPECTED'
  //           return Promise.reject(err);
  //         }
  //       }
  //     })
  //
  //     const { app, request, start, stop } = helper.server()
  //     app.use(enforcer.middleware())
  //     app.use((err, req, res, next) => {
  //       if (err.code === 'NOT_REALLY_UNEXPECTED') handledError = true
  //       res.sendStatus(500)
  //     })
  //
  //     await start()
  //     try {
  //       await request(enforcer, { resolveWithFullResponse: true, simple: false })
  //     } catch (err) {
  //       console.error(err)
  //     }
  //     await stop()
  //     expect(handledError).to.equal(true)
  //   })
  //
  //   it('will produce 404 for path not found', async () => {
  //     const definition = helper.definition.v3()
  //     const enforcer = Enforcer(definition)
  //     const { res } = await helper.request(enforcer, { uri: '/dne' })
  //     expect(res.statusCode).to.equal(404)
  //   })
  //
  //   it('will produce 400 for invalid request', async () => {
  //     const definition = helper.definition.v3()
  //     const get = definition.paths['/'].get
  //     get.parameters = [{
  //       name: 'date',
  //       in: 'query',
  //       schema: {
  //         type: 'string',
  //         format: 'date'
  //       }
  //     }]
  //     const enforcer = Enforcer(definition)
  //     const { res } = await helper.request(enforcer, { uri: '/?date=abc' })
  //     console.log(res.body)
  //     expect(res.statusCode).to.equal(400)
  //   })
  //
  //   it('invalid request (400) response must be valid response', async () => {
  //     const definition = helper.definition.v3()
  //     const get = definition.paths['/'].get
  //     get.parameters = [{
  //       name: 'date',
  //       in: 'query',
  //       schema: {
  //         type: 'string',
  //         format: 'date'
  //       }
  //     }]
  //     const enforcer = Enforcer(definition)
  //     enforcer.use((err, req, res, next) => {
  //       res.status(err.statusCode)
  //       res.send(err.message)
  //     })
  //     const { res } = await helper.request(enforcer, { uri: '/?date=abc' })
  //     expect(res.statusCode).to.equal(500)
  //   })
  //
  //   it('can process entire request successfully', async () => {
  //     const definition = helper.definition.v2()
  //     const get = {
  //       'x-controller': 'dates',
  //       'x-operation': 'startOf',
  //       parameters: [{
  //         name: 'date',
  //         in: 'path',
  //         type: 'string',
  //         format: 'date',
  //         required: true
  //       }],
  //       responses: {
  //         200: {
  //           description: '',
  //           schema: {
  //             type: 'string',
  //             format: 'date-time'
  //           }
  //         }
  //       }
  //     }
  //     definition.paths['/start-of/{date}'] = { get }
  //
  //     const enforcer = Enforcer(definition)
  //     enforcer.controllers({
  //       dates: {
  //         startOf (req, res) {
  //           res.send(req.params.date)
  //         }
  //       }
  //     })
  //
  //     const { res } = await helper.request(enforcer, { uri: '/start-of/2000-01-01' })
  //     expect(res.statusCode).to.equal(200)
  //     expect(res.body).to.equal('2000-01-01T00:00:00.000Z')
  //   })
  //
  //   it('can handle number response for body', async () => {
  //     const definition = helper.definition.v2()
  //     const get = {
  //       'x-controller': 'controller',
  //       'x-operation': 'operation',
  //       responses: {
  //         200: {
  //           description: '',
  //           schema: {
  //             type: 'number'
  //           }
  //         }
  //       }
  //     }
  //     definition.paths['/'] = { get }
  //
  //     const enforcer = Enforcer(definition)
  //     enforcer.controllers({
  //       controller: {
  //         operation (req, res) {
  //           res.send(10)
  //         }
  //       }
  //     })
  //
  //     const { res } = await helper.request(enforcer, { uri: '/' })
  //     expect(res.statusCode).to.equal(200)
  //     expect(res.body).to.equal('10')
  //   })
  //
  //   it('can handle date response for body', async () => {
  //     const definition = helper.definition.v2()
  //     const get = {
  //       'x-controller': 'controller',
  //       'x-operation': 'operation',
  //       responses: {
  //         200: {
  //           description: '',
  //           schema: {
  //             type: 'string',
  //             format: 'date-time'
  //           }
  //         }
  //       }
  //     }
  //     definition.paths['/'] = { get }
  //
  //     const enforcer = Enforcer(definition)
  //     enforcer.controllers({
  //       controller: {
  //         operation (req, res) {
  //           res.send(new Date('2000-01-02T03:04:05.678Z'))
  //         }
  //       }
  //     })
  //
  //     const { res } = await helper.request(enforcer, { uri: '/' })
  //     expect(res.statusCode).to.equal(200)
  //     expect(res.body).to.equal('2000-01-02T03:04:05.678Z')
  //   })
  //
  //   it('can handle object response for body', async () => {
  //     const definition = helper.definition.v2()
  //     const get = {
  //       'x-controller': 'controller',
  //       'x-operation': 'operation',
  //       responses: {
  //         200: {
  //           description: '',
  //           schema: {
  //             type: 'object'
  //           }
  //         }
  //       }
  //     }
  //     definition.paths['/'] = { get }
  //
  //     const enforcer = Enforcer(definition)
  //     enforcer.controllers({
  //       controller: {
  //         operation (req, res) {
  //           res.send({ a: 1 })
  //         }
  //       }
  //     })
  //
  //     const { res } = await helper.request(enforcer, { uri: '/' })
  //     expect(res.statusCode).to.equal(200)
  //     expect(res.body).to.equal(JSON.stringify({ a: 1 }))
  //   })
  //
  //   it('can handle complex object for response for body', async () => {
  //     const definition = helper.definition.v2()
  //     const get = {
  //       'x-controller': 'controller',
  //       'x-operation': 'operation',
  //       responses: {
  //         200: {
  //           description: '',
  //           schema: {
  //             type: 'object',
  //             properties: {
  //               name: { type: 'string' },
  //               birthdate: { type: 'string', format: 'date' }
  //             }
  //           }
  //         }
  //       }
  //     }
  //     definition.paths['/'] = { get }
  //
  //     function Person (name, birthdate) {
  //       this.name = name
  //       this.birthdate = birthdate
  //     }
  //
  //     Person.prototype.age = function () {
  //       const diff = Date.now() - +this.birthdate
  //       const date = new Date(diff)
  //       return date.getUTCFullYear() - 1970
  //     }
  //
  //     const enforcer = Enforcer(definition)
  //     enforcer.controllers({
  //       controller: {
  //         operation (req, res) {
  //           const bob = new Person('Bob', new Date('2000-01-01T00:00:00.000Z'))
  //           res.send(bob)
  //         }
  //       }
  //     })
  //
  //     const { res } = await helper.request(enforcer, { uri: '/' })
  //     expect(res.statusCode).to.equal(200)
  //     expect(res.body).to.equal(JSON.stringify({
  //       name: 'Bob',
  //       birthdate: '2000-01-01'
  //     }))
  //   })
  //
  //   it('can handle number response for body when no schema', async () => {
  //     const definition = helper.definition.v2()
  //     const get = {
  //       'x-controller': 'controller',
  //       'x-operation': 'operation',
  //       responses: {
  //         200: {
  //           description: ''
  //         }
  //       }
  //     }
  //     definition.paths['/'] = { get }
  //
  //     const enforcer = Enforcer(definition)
  //     enforcer.controllers({
  //       controller: {
  //         operation (req, res) {
  //           res.send(10)
  //         }
  //       }
  //     })
  //
  //     const { res } = await helper.request(enforcer, { uri: '/' })
  //     expect(res.statusCode).to.equal(200)
  //     expect(res.body).to.equal('10')
  //   })
  //
  //   it('can handle date response for body when no schema', async () => {
  //     const definition = helper.definition.v2()
  //     const get = {
  //       'x-controller': 'controller',
  //       'x-operation': 'operation',
  //       responses: {
  //         200: {
  //           description: ''
  //         }
  //       }
  //     }
  //     definition.paths['/'] = { get }
  //
  //     const enforcer = Enforcer(definition)
  //     enforcer.controllers({
  //       controller: {
  //         operation (req, res) {
  //           res.send(new Date('2000-01-02T03:04:05.678Z'))
  //         }
  //       }
  //     })
  //
  //     const { res } = await helper.request(enforcer, { uri: '/' })
  //     expect(res.statusCode).to.equal(200)
  //     expect(res.body).to.equal('"2000-01-02T03:04:05.678Z"')
  //   })
  //
  //   it('can handle object response for body when no schema', async () => {
  //     const definition = helper.definition.v2()
  //     const get = {
  //       'x-controller': 'controller',
  //       'x-operation': 'operation',
  //       responses: {
  //         200: {
  //           description: ''
  //         }
  //       }
  //     }
  //     definition.paths['/'] = { get }
  //
  //     const enforcer = Enforcer(definition)
  //     enforcer.controllers({
  //       controller: {
  //         operation (req, res) {
  //           res.send({ a: 1 })
  //         }
  //       }
  //     })
  //
  //     const { res } = await helper.request(enforcer, { uri: '/' })
  //     expect(res.statusCode).to.equal(200)
  //     expect(res.body).to.equal(JSON.stringify({ a: 1 }))
  //   })
  //
  //   it('can handle object response for body when no schema', async () => {
  //     const definition = helper.definition.v2()
  //     const get = {
  //       'x-controller': 'controller',
  //       'x-operation': 'operation',
  //       responses: {
  //         200: {
  //           description: '',
  //           schema: {
  //             type: 'object',
  //             additionalProperties: { type: 'number' }
  //           }
  //         }
  //       }
  //     }
  //     definition.paths['/'] = { get }
  //
  //     const enforcer = Enforcer(definition, { resSerialize: false, resValidate: false })
  //     enforcer.controllers({
  //       controller: {
  //         operation (req, res) {
  //           res.send({ a: 'hello' })
  //         }
  //       }
  //     })
  //
  //     const { res } = await helper.request(enforcer, { uri: '/' })
  //     expect(res.statusCode).to.equal(200)
  //     expect(res.body).to.equal(JSON.stringify({ a: 'hello' }))
  //   })
  // })
  //
  // describe('run manual mocks', () => {
  //   const schemaDef1 = {
  //     type: 'integer',
  //     minimum: 2,
  //     maximum: 2
  //   }
  //   const schemaDef2 = {
  //     type: 'integer',
  //     minimum: 10,
  //     maximum: 10
  //   }
  //   const v2Responses = {
  //     200: {
  //       description: '',
  //       schema: schemaDef1
  //     },
  //     201: {
  //       description: '',
  //       schema: schemaDef2
  //     }
  //   }
  //   const v3Responses = {
  //     200: {
  //       description: '',
  //       content: { 'application/json': { schema: schemaDef1 } }
  //     },
  //     201: {
  //       description: '',
  //       content: { 'application/json': { schema: schemaDef2 } }
  //     }
  //   }
  //
  //   it('will not mock without specified request without auto-mocking', async () => {
  //     const definition = helper.definition.v3()
  //     definition.paths['/'].get.responses = v3Responses
  //     const enforcer = Enforcer(definition)
  //     enforcer.mocks(null, false)
  //     const { res } = await helper.request(enforcer)
  //     expect(res.statusCode).to.equal(404)
  //   })
  //
  //   it('will mock without specified request if auto-mocking', async () => {
  //     const definition = helper.definition.v3()
  //     definition.paths['/'].get.responses = v3Responses
  //     const enforcer = Enforcer(definition)
  //     enforcer.mocks(undefined, true)
  //     const { res } = await helper.request(enforcer)
  //     expect(res.statusCode).to.equal(200)
  //   })
  //
  //   describe('v2', () => {
  //     it('can use default mock from query parameter', async () => {
  //       const definition = helper.definition.v2()
  //       definition.paths['/'].get.responses = v2Responses
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({}, false)
  //       const { res } = await helper.request(enforcer, { uri: '/?x-mock', json: true })
  //       expect(res.body).to.equal(2)
  //       expect(res.statusCode).to.equal(200)
  //     })
  //
  //     it('can use default mock from header', async () => {
  //       const definition = helper.definition.v2()
  //       definition.paths['/'].get.responses = v2Responses
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({}, false)
  //       const { res } = await helper.request(enforcer, { uri: '/', headers: { 'x-mock': '' }, json: true })
  //       expect(res.body).to.equal(2)
  //       expect(res.statusCode).to.equal(200)
  //     })
  //
  //     it('can use specified status code mock from query parameter', async () => {
  //       const definition = helper.definition.v2()
  //       definition.paths['/'].get.responses = v2Responses
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({}, false)
  //       const { res } = await helper.request(enforcer, { uri: '/?x-mock=201', json: true })
  //       expect(res.body).to.equal(10)
  //       expect(res.statusCode).to.equal(201)
  //     })
  //
  //     it('can use specified status code mock from header', async () => {
  //       const definition = helper.definition.v2()
  //       definition.paths['/'].get.responses = v2Responses
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({}, false)
  //       const { res } = await helper.request(enforcer, { uri: '/', headers: { 'x-mock': '201' }, json: true })
  //       expect(res.body).to.equal(10)
  //       expect(res.statusCode).to.equal(201)
  //     })
  //
  //     it('can mock from examples mime type', async () => {
  //       const definition = helper.definition.v2()
  //       definition.paths['/'].get.produces = ['foo/cat', 'foo/dog']
  //       definition.paths['/'].get.responses = {
  //         200: {
  //           description: '',
  //           examples: {
  //             'foo/cat': 'Mittens',
  //             'foo/dog': 'Fido'
  //           }
  //         }
  //       }
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({}, false)
  //       const { res } = await helper.request(enforcer, { uri: '/?x-mock', headers: { accept: 'foo/dog' } })
  //       expect(res.body).to.equal('Fido')
  //       expect(res.statusCode).to.equal(200)
  //     })
  //
  //     it('can mock from schema example', async () => {
  //       const definition = helper.definition.v2()
  //       definition.paths['/'].get.responses = {
  //         200: {
  //           description: '',
  //           schema: { type: 'string', example: 'Hello' }
  //         }
  //       }
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({}, false)
  //       const { res } = await helper.request(enforcer, { uri: '/?x-mock' })
  //       expect(res.body).to.equal('Hello')
  //       expect(res.statusCode).to.equal(200)
  //     })
  //
  //     it('overwrites mock example with mock controller', async () => {
  //       const definition = helper.definition.v2()
  //       definition['x-controller'] = 'my-controller'
  //       definition.paths['/'].get['x-operation'] = 'my-operation'
  //       definition.paths['/'].get.responses = {
  //         200: {
  //           description: '',
  //           schema: { type: 'string', example: 'Hello' }
  //         }
  //       }
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({
  //         'my-controller': {
  //           'my-operation': (req, res) => {
  //             res.send('mock controller')
  //           }
  //         }
  //       }, false)
  //       const { res } = await helper.request(enforcer, { uri: '/?x-mock' })
  //       expect(res.body).to.equal('mock controller')
  //       expect(res.statusCode).to.equal(200)
  //     })
  //
  //     it('can specify to use mock example despite existing mock controller', async () => {
  //       const definition = helper.definition.v2()
  //       definition['x-controller'] = 'my-controller'
  //       definition.paths['/'].get['x-operation'] = 'my-operation'
  //       definition.paths['/'].get.responses = {
  //         200: {
  //           description: '',
  //           schema: { type: 'string', example: 'Hello' }
  //         }
  //       }
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({
  //         'my-controller': {
  //           'my-operation': (req, res) => {
  //             res.send('mock controller')
  //           }
  //         }
  //       }, false)
  //       const { res } = await helper.request(enforcer, { uri: '/?x-mock=200,example' })
  //       expect(res.body).to.equal('Hello')
  //       expect(res.statusCode).to.equal(200)
  //     })
  //
  //     it('can specify to use random despite existing mock controller and example', async () => {
  //       const definition = helper.definition.v2()
  //       definition['x-controller'] = 'my-controller'
  //       definition.paths['/'].get['x-operation'] = 'my-operation'
  //       definition.paths['/'].get.responses = {
  //         200: {
  //           description: '',
  //           schema: { type: 'string', example: 'Hello' }
  //         }
  //       }
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({
  //         'my-controller': {
  //           'my-operation': (req, res) => {
  //             res.send('mock controller')
  //           }
  //         }
  //       }, false)
  //       const { res } = await helper.request(enforcer, { uri: '/?x-mock=200,random' })
  //       expect(res.body).not.to.be.oneOf(['Hello', 'mock controller'])
  //       expect(res.statusCode).to.equal(200)
  //     })
  //   })
  //
  //   describe('v3', () => {
  //     it('can use default mock from query parameter', async () => {
  //       const definition = helper.definition.v3()
  //       definition.paths['/'].get.responses = v3Responses
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({}, false)
  //       const { res } = await helper.request(enforcer, { uri: '/?x-mock', json: true })
  //       expect(res.body).to.equal(2)
  //       expect(res.statusCode).to.equal(200)
  //     })
  //
  //     it('can use default mock from header', async () => {
  //       const definition = helper.definition.v3()
  //       definition.paths['/'].get.responses = v3Responses
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({}, false)
  //       const { res } = await helper.request(enforcer, { uri: '/', headers: { 'x-mock': '' }, json: true })
  //       expect(res.body).to.equal(2)
  //       expect(res.statusCode).to.equal(200)
  //     })
  //
  //     it('can use specified status code mock from query parameter', async () => {
  //       const definition = helper.definition.v3()
  //       definition.paths['/'].get.responses = v3Responses
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({}, false)
  //       const { res } = await helper.request(enforcer, { uri: '/?x-mock=201', json: true })
  //       expect(res.body).to.equal(10)
  //       expect(res.statusCode).to.equal(201)
  //     })
  //
  //     it('can use specified status code mock from header', async () => {
  //       const definition = helper.definition.v3()
  //       definition.paths['/'].get.responses = v3Responses
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({}, false)
  //       const { res } = await helper.request(enforcer, { uri: '/', headers: { 'x-mock': '201' }, json: true })
  //       expect(res.body).to.equal(10)
  //       expect(res.statusCode).to.equal(201)
  //     })
  //
  //     it('can mock from content example', async () => {
  //       const definition = helper.definition.v3()
  //       definition.paths['/'].get.responses = {
  //         200: {
  //           description: '',
  //           content: {
  //             'application/json': {
  //               schema: { type: 'string' },
  //               example: 'Hello'
  //             }
  //           }
  //         }
  //       }
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({}, false)
  //       const { res } = await helper.request(enforcer, { uri: '/?x-mock' })
  //       expect(res.body).to.equal('Hello')
  //       expect(res.statusCode).to.equal(200)
  //     })
  //
  //     it('can mock from named example', async () => {
  //       const definition = helper.definition.v3()
  //       definition.paths['/'].get.responses = {
  //         200: {
  //           description: '',
  //           content: {
  //             'application/json': {
  //               schema: { type: 'string' },
  //               examples: {
  //                 cat: { value: 'Mittens' },
  //                 dog: { value: 'Fido' }
  //               }
  //             }
  //           }
  //         }
  //       }
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({}, false)
  //       const { res } = await helper.request(enforcer, { uri: '/?x-mock=200,example,dog' })
  //       expect(res.body).to.equal('Fido')
  //       expect(res.statusCode).to.equal(200)
  //     })
  //
  //     it('can mock from schema example', async () => {
  //       const definition = helper.definition.v3()
  //       definition.paths['/'].get.responses = {
  //         200: {
  //           description: '',
  //           content: {
  //             'application/json': {
  //               schema: { type: 'string', example: 'Hello' }
  //             }
  //           }
  //         }
  //       }
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({}, false)
  //       const { res } = await helper.request(enforcer, { uri: '/?x-mock' })
  //       expect(res.body).to.equal('Hello')
  //       expect(res.statusCode).to.equal(200)
  //     })
  //
  //     it('overwrites mock example with mock controller', async () => {
  //       const definition = helper.definition.v3()
  //       definition['x-controller'] = 'my-controller'
  //       definition.paths['/'].get['x-operation'] = 'my-operation'
  //       definition.paths['/'].get.responses = {
  //         200: {
  //           description: '',
  //           content: {
  //             'application/json': {
  //               schema: { type: 'string', example: 'Hello' }
  //             }
  //           }
  //         }
  //       }
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({
  //         'my-controller': {
  //           'my-operation': (req, res) => {
  //             res.send('mock controller')
  //           }
  //         }
  //       }, false)
  //       const { res } = await helper.request(enforcer, { uri: '/?x-mock' })
  //       expect(res.body).to.equal('mock controller')
  //       expect(res.statusCode).to.equal(200)
  //     })
  //
  //     it('can specify to use mock example despite existing mock controller', async () => {
  //       const definition = helper.definition.v3()
  //       definition['x-controller'] = 'my-controller'
  //       definition.paths['/'].get['x-operation'] = 'my-operation'
  //       definition.paths['/'].get.responses = {
  //         200: {
  //           description: '',
  //           content: {
  //             'application/json': {
  //               schema: { type: 'string', example: 'Hello' }
  //             }
  //           }
  //         }
  //       }
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({
  //         'my-controller': {
  //           'my-operation': (req, res) => {
  //             res.send('mock controller')
  //           }
  //         }
  //       }, false)
  //       const { res } = await helper.request(enforcer, { uri: '/?x-mock=200,example' })
  //       expect(res.body).to.equal('Hello')
  //       expect(res.statusCode).to.equal(200)
  //     })
  //
  //     it('can specify to use random despite existing mock controller and example', async () => {
  //       const definition = helper.definition.v3()
  //       definition['x-controller'] = 'my-controller'
  //       definition.paths['/'].get['x-operation'] = 'my-operation'
  //       definition.paths['/'].get.responses = {
  //         200: {
  //           description: '',
  //           content: {
  //             'application/json': {
  //               schema: { type: 'string', example: 'Hello' }
  //             }
  //           }
  //         }
  //       }
  //       const enforcer = Enforcer(definition)
  //       enforcer.mocks({
  //         'my-controller': {
  //           'my-operation': (req, res) => {
  //             res.send('mock controller')
  //           }
  //         }
  //       }, false)
  //       const { res } = await helper.request(enforcer, { uri: '/?x-mock=200,random' })
  //       expect(res.body).not.to.be.oneOf(['Hello', 'mock controller'])
  //       expect(res.statusCode).to.equal(200)
  //     })
  //   })
  // })
})
