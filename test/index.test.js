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
const Enforcer = require('openapi-enforcer')
const Middleware = require('../dist')
const path = require('path')
const utils = require('../test-resources/test-utils')

const resources = path.resolve(__dirname, '..', 'test-resources')
const expect = chai.expect
chai.use(chaiAsPromised)

const { ok, on, spec, test } = utils

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

  describe('readOnly and writeOnly', function () {
    function merge (target, source) {
      Object.keys(source).forEach(key => {
        const value = source[key]
        if (key in target) {
          if (typeof value === 'object' && value !== null && typeof target[key] === 'object' && target[key] !== null) {
            merge(target[key], value)
          } else {
            target[key] = value
          }
        } else {
          target[key] = value
        }
      })
    }

    function rwContent (schema = {}) {
      const result = {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              read: {
                type: 'string',
                readOnly: true
              },
              write: {
                type: 'string',
                writeOnly: true
              }
            }
          }
        }
      }
      merge(result['application/json'].schema, schema)
      return result
    }

    it('enforces read only properties for request bodies', async () => {
      const doc = spec.openapi([{
        method: 'post',
        path: '/',
      }])
      const op = doc.paths['/'].post
      op.requestBody = { content: rwContent({ required: ['read', 'write']}) }

      function routeHook (app) {
        app.post('/', ok())
      }

      await test({ doc, routeHook }, async (request) => {
        let res = await request({ path: '/', method: 'post', body: { read: 'abc', write: 'abc' } })
        expect(res.statusCode).to.equal(400)
        expect(res.body).to.match(/Cannot write to read only properties/)
      })
    })

    it.only('enforces write only properties for response bodies', async () => {
      const doc = spec.openapi([{
        method: 'get',
        path: '/',
      }])
      const op = doc.paths['/'].get
      merge(op.responses[200], { content: rwContent({ required: ['read', 'write']}) })

      function routeHook (app) {
        app.get('/', (req, res) => {
          res.enforcer.send({ read: 'abc', write: 'abc' })
        })
      }

      await test({ doc, routeHook }, async (request) => {
        let res = await request({ path: '/', method: 'get' })
        expect(res.statusCode).to.equal(500)
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

    it('can handle fallback mocking', async () => {
      const doc = spec.openapi([{
        responses: [
          { code: 200, schema: { type: 'number', minimum: 0, maximum: 5 } }
        ]
      }])

      await test({ doc, fallbackMocking: true }, async (request) => {
        let res = await request({ path: '/' })
        expect(res.statusCode).to.equal(200)
        expect(res.body).to.be.at.least(0)
        expect(res.body).to.be.at.most(5)
      })
    })

    it('can use a mock store', async function () {
      const doc = spec.openapi([
        {
          method: 'get',
          responses: [
            { code: 200, type: 'text/plain', schema: { type: 'string' } }
          ]
        },
        {
          method: 'post',
          responses: [
            { code: 200, type: 'text/plain', schema: { type: 'string' } }
          ]
        }
      ])
      doc.paths['/'].post.requestBody = {
        content: {
          'text/plain': {
            schema: { type: 'string' }
          }
        }
      }
      doc['x-mock-implemented'] = true

      function routeHook (app) {
        app.get('/', async (req, res) => {
          const mockStore = req.enforcer.mockStore
          const value = await mockStore.get('value')
          res.set('content-type', 'text/plain')
          res.send(value)
        })

        app.post('/', async (req, res) => {
          const mockStore = req.enforcer.mockStore
          const value = String(req.body)
          await mockStore.set('value', value)
          res.set('content-type', 'text/plain')
          res.send(value)
        })
      }

      await test({ doc, routeHook }, async (request) => {
        let res = await request({ method: 'get', path: '/?x-mock' })
        expect(res.body).to.equal('')
        const cookie = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ')

        res = await request({ method: 'post', body: 'foo', path: '/?x-mock', headers: { cookie } })
        expect(res.body).to.equal('foo')

        res = await request({ method: 'get', path: '/?x-mock', headers: { cookie } })
        expect(res.body).to.equal('foo')

        res = await request({ method: 'post', body: 'bar', path: '/?x-mock', headers: { cookie } })
        expect(res.body).to.equal('bar')

        res = await request({ method: 'get', path: '/?x-mock', headers: { cookie } })
        expect(res.body).to.equal('bar')
      })
    })

    describe('mock result priority', function () {
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

      it('will use implementation if it exists', async () => {
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
          expect(res.body).to.be.oneOf(['hello', 'bye'])

          // mock query request disabled
          res = await request({ path: '/?x-mock=201' })
          expect(res.statusCode).to.equal(201)
          expect(res.body).to.equal(true)
        })
      })

      it('can specify a response mode', async () => {
        await test({ doc }, async (request) => {
          // no mock request and route implemented
          let res = await request({ path: '/?x-mock=200,random' })
          expect(res.statusCode).to.equal(200)
          expect(res.body).not.to.be.oneOf(['hello', 'bye'])
        })
      })

      describe('examples', () => {
        it('v2 can specify a example content type', async () => {
          const doc = spec.swagger([{
            responses: [
              { code: 200, type: 'text/foo', example: 'foo', schema: { type: 'string' } }
            ]
          }])
          doc.paths['/'].get.produces.push('text/bar')
          doc.paths['/'].get.responses[200].examples['text/bar'] = 'bar'
          await test({ doc }, async (request) => {
            let res = await request({ path: '/?x-mock', headers: { accept: 'text/foo' } })
            expect(res.statusCode).to.equal(200)
            expect(res.body).to.equal('foo')

            res = await request({ path: '/?x-mock', headers: { accept: 'text/bar' } })
            expect(res.statusCode).to.equal(200)
            expect(res.body).to.equal('bar')
          })
        })

        it('v3 can specify a response example by name', async () => {
          await test({ doc }, async (request) => {
            // include mock request and route implemented
            let res = await request({ path: '/?x-mock=200,example,hello' })
            expect(res.statusCode).to.equal(200)
            expect(res.body).to.equal('hello')
          })
        })
      })

      it('will take the first query mock query parameter if multiple supplied', async () => {
        await test({ doc }, async (request) => {
          // include mock request and route implemented
          let res = await request({ path: '/?x-mock=200,example,hello&x-mock=201' })
          expect(res.statusCode).to.equal(200)
          expect(res.body).to.equal('hello')
        })
      })
    })

    describe('unable to mock', () => {
      it('will handle un-mockable status codes', async () => {
        const doc = spec.openapi([{
          responses: [{ code: 200, type: 'application/json', schema: { type: 'integer' } }]
        }])
        await test({ doc }, async (request) => {
          // include mock request and route implemented
          let res = await request({ path: '/?x-mock=204' })
          expect(res.statusCode).to.equal(422)
          expect(res.body).to.match(/the spec does not define this response code/i)
        })
      })

      it('will handle un-mockable content-type', async () => {
        const doc = spec.openapi([{
          responses: [{ code: 200, type: 'application/json', schema: { type: 'integer' } }]
        }])
        await test({ doc }, async (request) => {
          // include mock request and route implemented
          let res = await request({ path: '/?x-mock=200', headers: { accept: 'application/xml' } })
          expect(res.statusCode).to.equal(406)
          expect(res.body).to.equal('Not acceptable')
        })
      })

      describe('v2', () => {
        it('will handle un-mockable content-type example', async () => {
          const doc = spec.swagger([{
            responses: [{ code: 200, type: 'application/json', schema: { type: 'integer' } }]
          }])
          await test({ doc }, async (request) => {
            // include mock request and route implemented
            let res = await request({ path: '/?x-mock=200,example' })
            expect(res.statusCode).to.equal(422)
            expect(res.body).to.match(/cannot mock from example/i)
          })
        })

        it('will handle un-mockable random', async () => {
          const doc = spec.swagger([{
            responses: [{ code: 200, type: 'application/json' }]
          }])
          await test({ doc }, async (request) => {
            // include mock request and route implemented
            let res = await request({ path: '/?x-mock=200,random' })
            expect(res.statusCode).to.equal(422)
            expect(res.body).to.match(/unable to generate a random value/i)
          })
        })

      })

      describe('v3', () => {
        it('will handle un-mockable content-type example', async () => {
          const doc = spec.openapi([{
            responses: [{ code: 200, type: 'application/json', schema: { type: 'integer' } }]
          }])
          await test({ doc }, async (request) => {
            // include mock request and route implemented
            let res = await request({ path: '/?x-mock=200,example' })
            expect(res.statusCode).to.equal(422)
            expect(res.body).to.match(/mock example is not defined/)
          })
        })

        it('will handle un-mockable content-type example due to wrong name', async () => {
          const doc = spec.openapi([{
            responses: [{ code: 200, type: 'application/json', examples: { foo: 1 }, schema: { type: 'integer' } }]
          }])
          await test({ doc }, async (request) => {
            // include mock request and route implemented
            let res = await request({ path: '/?x-mock=200,example,foo' })
            expect(res.statusCode).to.equal(200)
            expect(res.body).to.equal(1)

            res = await request({ path: '/?x-mock=200,example,bar' })
            expect(res.statusCode).to.equal(422)
            expect(res.body).to.match(/no example value with the name specified/)
          })
        })

        it('will handle un-mockable random', async () => {
          const doc = spec.openapi([{
            responses: [{ code: 200, type: 'application/json' }]
          }])
          await test({ doc }, async (request) => {
            // include mock request and route implemented
            let res = await request({ path: '/?x-mock=200,random' })
            expect(res.statusCode).to.equal(422)
            expect(res.body).to.match(/no content types are specified/i)
          })
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

        app.use((err, req, res, _next) => {
          caughtError = true
          res.sendStatus(418)
        })
      }

      await test({ doc, routeHook }, async (request) => {
        // non-validated response
        let res = await request({ path: '/?validate=false' })
        expect(res.statusCode).to.equal(200)
        expect(res.body).to.equal(true)

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

        app.use((err, req, res, _next) => {
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

  describe('route builder', function () {
    const controllers = path.resolve(resources, 'controllers')

    it('will identify missing controller file', async () => {
      const doc = spec.openapi([{
        responses: [{ code: 200, schema: { type: 'number' }}]
      }])
      doc['x-controller'] = 'foo'
      doc.paths['/'].get['x-operation'] = 'bar'

      const promise = Enforcer(doc)
      const mw = Middleware(promise)
      mw.route(path.resolve(resources, ))
      const results = await on(mw, 'error')
      expect(results.length).to.equal(1)
      expect(results[0].code).to.equal('MODULE_NOT_FOUND')
    })

    it('will identify a missing operation', async function () {
      const doc = spec.openapi([{
        responses: [{ code: 200, schema: { type: 'number' }}]
      }])
      doc['x-controller'] = 'basic'
      doc.paths['/'].get['x-operation'] = 'foo'

      const promise = Enforcer(doc)
      const mw = Middleware(promise)
      mw.route(controllers)
      const results = await on(mw, 'error')
      expect(results.length).to.equal(1)
      expect(results[0].code).to.equal('ENFORCER_MIDDLEWARE_ROUTE_NO_OP')
    })

    it('will require the controller file to export a function', async function () {
      const doc = spec.openapi([{
        responses: [{ code: 200, schema: { type: 'number' }}]
      }])
      doc['x-controller'] = 'no-function-exported'
      doc.paths['/'].get['x-operation'] = 'foo'

      const promise = Enforcer(doc)
      const mw = Middleware(promise)
      mw.route(controllers)
      const results = await on(mw, 'error')
      expect(results.length).to.equal(1)
      expect(results[0].code).to.equal('ENFORCER_MIDDLEWARE_ROUTE_FACTORY')
    })

    it('will catch errors outside the factory function', async function () {
      const doc = spec.openapi([{
        responses: [{ code: 200, schema: { type: 'number' }}]
      }])
      doc['x-controller'] = 'error-outside'
      doc.paths['/'].get['x-operation'] = 'foo'

      const promise = Enforcer(doc)
      const mw = Middleware(promise)
      mw.route(controllers)
      const results = await on(mw, 'error')
      expect(results.length).to.equal(1)
      expect(results[0]).to.be.instanceOf(Error)
      expect(results[0].message).to.equal('Outside error')
    })

    it('will catch errors inside the factory function', async function () {
      const doc = spec.openapi([{
        responses: [{ code: 200, schema: { type: 'number' }}]
      }])
      doc['x-controller'] = 'error-in-factory'
      doc.paths['/'].get['x-operation'] = 'foo'

      const promise = Enforcer(doc)
      const mw = Middleware(promise)
      mw.route(controllers)
      const results = await on(mw, 'error')
      expect(results.length).to.equal(1)
      expect(results[0]).to.be.instanceOf(Error)
      expect(results[0].message).to.equal('An error')
    })

    it('can build a route', async function () {
      const doc = spec.openapi([{
        path: '/',
        method: 'get',
        responses: [{ code: 200, schema: { type: 'string' }}]
      }])
      doc['x-controller'] = 'basic'
      doc.paths['/'].get['x-operation'] = 'myGet'

      await test({ doc, routeBuilder: {} }, async (request) => {
        let res = await request({ path: '/' })
        expect(res.statusCode).to.equal(200)
        expect(res.body).to.equal('get: 0')
      })
    })

    it('can build multiple routes', async function () {
      const doc = spec.openapi([
        {
          path: '/',
          method: 'get',
          responses: [{ code: 200, schema: { type: 'string' }}]
        },
        {
          path: '/',
          method: 'post',
          responses: [{ code: 200, schema: { type: 'string' }}]
        }
      ])
      doc['x-controller'] = 'basic'
      doc.paths['/'].get['x-operation'] = 'myGet'
      doc.paths['/'].post['x-operation'] = 'myPost'

      await test({ doc, routeBuilder: {} }, async (request) => {
        let res = await request({ path: '/' })
        expect(res.statusCode).to.equal(200)
        expect(res.body).to.equal('get: 0')

        res = await request({ method: 'post', path: '/' })
        expect(res.statusCode).to.equal(200)
        expect(res.body).to.equal('post: 0')
      })
    })

    it('can inject dependencies as an array', async function () {
      const doc = spec.openapi([{
        path: '/',
        method: 'get',
        responses: [{ code: 200, schema: { type: 'string' }}]
      }])
      doc['x-controller'] = 'basic'
      doc.paths['/'].get['x-operation'] = 'myGet'

      await test({ doc, routeBuilder: { dependencies: ['a', 2] } }, async (request) => {
        let res = await request({ path: '/' })
        expect(res.statusCode).to.equal(200)
        expect(res.body).to.equal('get: 2 a,2')
      })
    })

    it('can inject dependencies from a map', async function () {
      const doc = spec.openapi([{
        path: '/',
        method: 'get',
        responses: [{ code: 200, schema: { type: 'string' }}]
      }])
      doc['x-controller'] = 'basic'
      doc.paths['/'].get['x-operation'] = 'myGet'

      await test({ doc, routeBuilder: { dependencies: { basic: ['a', 'b', 'c'], foo: [] } } }, async (request) => {
        let res = await request({ path: '/' })
        expect(res.statusCode).to.equal(200)
        expect(res.body).to.equal('get: 3 a,b,c')
      })
    })

    it('can inject common dependencies from a map', async function () {
      const doc = spec.openapi([{
        path: '/',
        method: 'get',
        responses: [{ code: 200, schema: { type: 'string' }}]
      }])
      doc['x-controller'] = 'basic'
      doc.paths['/'].get['x-operation'] = 'myGet'

      await test({ doc, routeBuilder: { dependencies: { common: ['foo', 'bar'], basic: ['a', 'b', 'c'], foo: [] } } }, async (request) => {
        let res = await request({ path: '/' })
        expect(res.statusCode).to.equal(200)
        expect(res.body).to.equal('get: 5 a,b,c,foo,bar')
      })
    })

    it('can inject common dependencies with a different common dependency key from a map', async function () {
      const doc = spec.openapi([{
        path: '/',
        method: 'get',
        responses: [{ code: 200, schema: { type: 'string' }}]
      }])
      doc['x-controller'] = 'basic'
      doc.paths['/'].get['x-operation'] = 'myGet'

      await test({ doc, routeBuilder: { commonDependencyKey: 'bar', dependencies: { common: ['foo', 'bar'], basic: ['a', 'b', 'c'], bar: ['baz'] } } }, async (request) => {
        let res = await request({ path: '/' })
        expect(res.statusCode).to.equal(200)
        expect(res.body).to.equal('get: 4 a,b,c,baz')
      })
    })
  })

})
