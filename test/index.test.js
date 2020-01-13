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
const Enforcer = require('../index')
const helper = require('./resources/helper')
const path = require('path')

const expect = chai.expect
chai.use(chaiAsPromised)

/* global describe it */
describe('openapi-enforcer-middleware', () => {
  describe('map controllers', () => {
    it('will produce exception for invalid controller target', () => {
      const definition = helper.definition.v3()
      definition['x-controller'] = 'dne'
      definition.paths['/'].get['x-operation'] = 'dne'
      const enforcer = Enforcer(definition)
      const promise = enforcer.controllers()
      return expect(promise).to.be.rejectedWith(/Controllers target must be a string, a non-null object, or a function that returns a non-null object/)
    })

    it('will produce exception for missing controller file', () => {
      const definition = helper.definition.v3()
      definition['x-controller'] = 'dne'
      definition.paths['/'].get['x-operation'] = 'dne'
      const enforcer = Enforcer(definition)
      const promise = enforcer.controllers(path.resolve(__dirname, 'resources'))
      return expect(promise).to.be.rejectedWith(/at: dne\s+Cannot find module/)
    })

    it('will produce exception for controller file that failed to be required', () => {
      const definition = helper.definition.v3()
      definition['x-controller'] = 'internal-error'
      definition.paths['/'].get['x-operation'] = 'x'
      const enforcer = Enforcer(definition)
      const promise = enforcer.controllers(path.resolve(__dirname, 'resources'))
      return expect(promise).to.be.rejectedWith(/Cannot find module/)
    })

    it('will produce exception for missing operation', () => {
      const definition = helper.definition.v3()
      definition['x-controller'] = 'controller'
      definition.paths['/'].get['x-operation'] = 'dne'
      const enforcer = Enforcer(definition)
      const promise = enforcer.controllers(path.resolve(__dirname, 'resources'))
      return expect(promise).to.be.rejectedWith(/at: controller\s+Operation not found: dne/)
    })

    it('will produce exception for missing mapped controller', () => {
      const definition = helper.definition.v3()
      definition['x-controller'] = 'dne'
      definition.paths['/'].get['x-operation'] = 'dne'
      const enforcer = Enforcer(definition)
      const promise = enforcer.controllers({})
      return expect(promise).to.be.rejectedWith(/at: dne\s+Controller not found/)
    })

    it('will produce exception for missing operation of mapped controller', () => {
      const definition = helper.definition.v3()
      definition['x-controller'] = 'controller'
      definition.paths['/'].get['x-operation'] = 'dne'
      const enforcer = Enforcer(definition)
      const promise = enforcer.controllers({ controller: {} })
      return expect(promise).to.be.rejectedWith(/at: controller\s+Controller operation not found: dne/)
    })

    it('will allow an operation to be a function', () => {
      const definition = helper.definition.v3()
      definition['x-controller'] = 'controller'
      definition.paths['/'].get['x-operation'] = 'empty'
      const enforcer = Enforcer(definition)
      const promise = enforcer.controllers({ controller: { empty: () => {} } })
      return expect(promise).to.eventually.be.a('Map')
    })

    it('will allow an operation to be an array of functions', () => {
      const definition = helper.definition.v3()
      definition['x-controller'] = 'controller'
      definition.paths['/'].get['x-operation'] = 'empty'
      const enforcer = Enforcer(definition)
      const promise = enforcer.controllers({
        controller: {
          empty: [() => {}]
        }
      })
      return expect(promise).to.eventually.be.a('Map')
    })

    it('will produce an exception if an operation is an array not of functions', () => {
      const definition = helper.definition.v3()
      definition['x-controller'] = 'controller'
      definition.paths['/'].get['x-operation'] = 'invalid'
      const enforcer = Enforcer(definition)
      const promise = enforcer.controllers({
        controller: {
          invalid: [1]
        }
      })
      return expect(promise).to.be.rejectedWith(/at: 0\s+Not a function/)
    })

    it('will produce an exception if an operation is not a function', () => {
      const definition = helper.definition.v3()
      definition['x-controller'] = 'controller'
      definition.paths['/'].get['x-operation'] = 'invalid'
      const enforcer = Enforcer(definition)
      const promise = enforcer.controllers({
        controller: {
          invalid: 1
        }
      })
      return expect(promise).to.be.rejectedWith(/at: controller\s+Expected a function or an array of functions. Received: 1/)
    })

    it('allows the controllers target to be a function', () => {
      const definition = helper.definition.v3()
      definition['x-controller'] = 'controller'
      definition.paths['/'].get['x-operation'] = 'empty'
      const enforcer = Enforcer(definition)
      const promise = enforcer.controllers(function () {
        return {
          controller: {
            empty: [() => {}]
          }
        }
      })
      return expect(promise).to.eventually.be.a('Map')
    })

    it('throw an exception if the controllers target as a function does not return a non-null object', () => {
      const definition = helper.definition.v3()
      definition['x-controller'] = 'controller'
      definition.paths['/'].get['x-operation'] = 'empty'
      const enforcer = Enforcer(definition)
      const promise = enforcer.controllers(function () {
        return null
      })
      return expect(promise).to.be.rejectedWith(/Controllers target function must return a non-null object/)
    })

    describe('dependency injection', () => {
      it('injects for controllers target as function', async () => {
        const injected = []
        function target (a, b, c) {
          injected.push(a, b, c)
          return {}
        }
        const enforcer = Enforcer(helper.definition.v3())
        await enforcer.controllers(target, 1, 2, 3)
        expect(injected).to.deep.equal([1, 2, 3])
      })

      it('injects for controllers target as file path when controller file returns function', async () => {
        const definition = helper.definition.v3()
        definition['x-controller'] = 'injectable'
        definition.paths['/'].get['x-operation'] = 'injected'
        const enforcer = Enforcer(definition)
        enforcer.controllers(path.resolve(__dirname, 'resources'), 1, 'b', false)
        const { res } = await helper.request(enforcer, { json: true })
        expect(res.body).to.deep.equal([1, 'b', false])
      })
    })
  })

  describe('run controllers', () => {
    it('thrown middleware errors are passed to existing internal error middleware', async () => {
      let handledError = false
      const definition = helper.definition.v3()
      definition['x-controller'] = 'hasError'
      definition.paths['/'].get['x-operation'] = 'hasError'
      definition.paths['/'].get.responses.default = { description: '' }
      const enforcer = Enforcer(definition)
      enforcer.controllers({
        hasError: {
          hasError (req, res) {
            const err = Error('Unexpected error')
            err.code = 'NOT_REALLY_UNEXPECTED'
            throw err
          }
        }
      })
      enforcer.use((err, req, res, next) => {
        if (err.code === 'NOT_REALLY_UNEXPECTED') handledError = true
        res.sendStatus(500)
      })
      const { res } = await helper.request(enforcer)
      expect(handledError).to.equal(true)
      expect(res.statusCode).to.equal(500)
    })

    it('thrown middleware errors are passed to external error middleware', async () => {
      let handledError = false
      const definition = helper.definition.v3()
      definition['x-controller'] = 'hasError'
      definition.paths['/'].get['x-operation'] = 'hasError'
      definition.paths['/'].get.responses.default = { description: '' }
      const enforcer = Enforcer(definition)
      enforcer.controllers({
        hasError: {
          hasError (req, res) {
            const err = Error('Unexpected error')
            err.code = 'NOT_REALLY_UNEXPECTED'
            throw err
          }
        }
      })

      const { app, request, start, stop } = helper.server()
      app.use(enforcer.middleware())
      app.use((err, req, res, next) => {
        if (err.code === 'NOT_REALLY_UNEXPECTED') handledError = true
        res.sendStatus(500)
      })

      await start()
      try {
        await request(enforcer, { resolveWithFullResponse: true, simple: false })
      } catch (err) {
        console.error(err)
      }
      await stop()
      expect(handledError).to.equal(true)
    })

    it('thrown async middleware errors are passed to external error middleware', async () => {
      let handledError = false
      const definition = helper.definition.v3()
      definition['x-controller'] = 'hasError'
      definition.paths['/'].get['x-operation'] = 'hasError'
      definition.paths['/'].get.responses.default = { description: '' }
      const enforcer = Enforcer(definition)
      enforcer.controllers({
        hasError: {
          hasError (req, res) {
            const err = Error('Unexpected async error')
            err.code = 'NOT_REALLY_UNEXPECTED'
            return Promise.reject(err);
          }
        }
      })

      const { app, request, start, stop } = helper.server()
      app.use(enforcer.middleware())
      app.use((err, req, res, next) => {
        if (err.code === 'NOT_REALLY_UNEXPECTED') handledError = true
        res.sendStatus(500)
      })

      await start()
      try {
        await request(enforcer, { resolveWithFullResponse: true, simple: false })
      } catch (err) {
        console.error(err)
      }
      await stop()
      expect(handledError).to.equal(true)
    })

    it('will produce 404 for path not found', async () => {
      const definition = helper.definition.v3()
      const enforcer = Enforcer(definition)
      const { res } = await helper.request(enforcer, { uri: '/dne' })
      expect(res.statusCode).to.equal(404)
    })

    it('will produce 400 for invalid request', async () => {
      const definition = helper.definition.v3()
      const get = definition.paths['/'].get
      get.parameters = [{
        name: 'date',
        in: 'query',
        schema: {
          type: 'string',
          format: 'date'
        }
      }]
      const enforcer = Enforcer(definition)
      const { res } = await helper.request(enforcer, { uri: '/?date=abc' })
      console.log(res.body)
      expect(res.statusCode).to.equal(400)
    })

    it('invalid request (400) response must be valid response', async () => {
      const definition = helper.definition.v3()
      const get = definition.paths['/'].get
      get.parameters = [{
        name: 'date',
        in: 'query',
        schema: {
          type: 'string',
          format: 'date'
        }
      }]
      const enforcer = Enforcer(definition)
      enforcer.use((err, req, res, next) => {
        res.status(err.statusCode)
        res.send(err.message)
      })
      const { res } = await helper.request(enforcer, { uri: '/?date=abc' })
      expect(res.statusCode).to.equal(500)
    })

    it('can process entire request successfully', async () => {
      const definition = helper.definition.v2()
      const get = {
        'x-controller': 'dates',
        'x-operation': 'startOf',
        parameters: [{
          name: 'date',
          in: 'path',
          type: 'string',
          format: 'date',
          required: true
        }],
        responses: {
          200: {
            description: '',
            schema: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
      definition.paths['/start-of/{date}'] = { get }

      const enforcer = Enforcer(definition)
      enforcer.controllers({
        dates: {
          startOf (req, res) {
            res.send(req.params.date)
          }
        }
      })

      const { res } = await helper.request(enforcer, { uri: '/start-of/2000-01-01' })
      expect(res.statusCode).to.equal(200)
      expect(res.body).to.equal('2000-01-01T00:00:00.000Z')
    })

    it('can handle number response for body', async () => {
      const definition = helper.definition.v2()
      const get = {
        'x-controller': 'controller',
        'x-operation': 'operation',
        responses: {
          200: {
            description: '',
            schema: {
              type: 'number'
            }
          }
        }
      }
      definition.paths['/'] = { get }

      const enforcer = Enforcer(definition)
      enforcer.controllers({
        controller: {
          operation (req, res) {
            res.send(10)
          }
        }
      })

      const { res } = await helper.request(enforcer, { uri: '/' })
      expect(res.statusCode).to.equal(200)
      expect(res.body).to.equal('10')
    })

    it('can handle date response for body', async () => {
      const definition = helper.definition.v2()
      const get = {
        'x-controller': 'controller',
        'x-operation': 'operation',
        responses: {
          200: {
            description: '',
            schema: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
      definition.paths['/'] = { get }

      const enforcer = Enforcer(definition)
      enforcer.controllers({
        controller: {
          operation (req, res) {
            res.send(new Date('2000-01-02T03:04:05.678Z'))
          }
        }
      })

      const { res } = await helper.request(enforcer, { uri: '/' })
      expect(res.statusCode).to.equal(200)
      expect(res.body).to.equal('2000-01-02T03:04:05.678Z')
    })

    it('can handle object response for body', async () => {
      const definition = helper.definition.v2()
      const get = {
        'x-controller': 'controller',
        'x-operation': 'operation',
        responses: {
          200: {
            description: '',
            schema: {
              type: 'object'
            }
          }
        }
      }
      definition.paths['/'] = { get }

      const enforcer = Enforcer(definition)
      enforcer.controllers({
        controller: {
          operation (req, res) {
            res.send({ a: 1 })
          }
        }
      })

      const { res } = await helper.request(enforcer, { uri: '/' })
      expect(res.statusCode).to.equal(200)
      expect(res.body).to.equal(JSON.stringify({ a: 1 }))
    })

    it('can handle complex object for response for body', async () => {
      const definition = helper.definition.v2()
      const get = {
        'x-controller': 'controller',
        'x-operation': 'operation',
        responses: {
          200: {
            description: '',
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                birthdate: { type: 'string', format: 'date' }
              }
            }
          }
        }
      }
      definition.paths['/'] = { get }

      function Person (name, birthdate) {
        this.name = name
        this.birthdate = birthdate
      }

      Person.prototype.age = function () {
        const diff = Date.now() - +this.birthdate
        const date = new Date(diff)
        return date.getUTCFullYear() - 1970
      }

      const enforcer = Enforcer(definition)
      enforcer.controllers({
        controller: {
          operation (req, res) {
            const bob = new Person('Bob', new Date('2000-01-01T00:00:00.000Z'))
            res.send(bob)
          }
        }
      })

      const { res } = await helper.request(enforcer, { uri: '/' })
      expect(res.statusCode).to.equal(200)
      expect(res.body).to.equal(JSON.stringify({
        name: 'Bob',
        birthdate: '2000-01-01'
      }))
    })

    it('can handle number response for body when no schema', async () => {
      const definition = helper.definition.v2()
      const get = {
        'x-controller': 'controller',
        'x-operation': 'operation',
        responses: {
          200: {
            description: ''
          }
        }
      }
      definition.paths['/'] = { get }

      const enforcer = Enforcer(definition)
      enforcer.controllers({
        controller: {
          operation (req, res) {
            res.send(10)
          }
        }
      })

      const { res } = await helper.request(enforcer, { uri: '/' })
      expect(res.statusCode).to.equal(200)
      expect(res.body).to.equal('10')
    })

    it('can handle date response for body when no schema', async () => {
      const definition = helper.definition.v2()
      const get = {
        'x-controller': 'controller',
        'x-operation': 'operation',
        responses: {
          200: {
            description: ''
          }
        }
      }
      definition.paths['/'] = { get }

      const enforcer = Enforcer(definition)
      enforcer.controllers({
        controller: {
          operation (req, res) {
            res.send(new Date('2000-01-02T03:04:05.678Z'))
          }
        }
      })

      const { res } = await helper.request(enforcer, { uri: '/' })
      expect(res.statusCode).to.equal(200)
      expect(res.body).to.equal('"2000-01-02T03:04:05.678Z"')
    })

    it('can handle object response for body when no schema', async () => {
      const definition = helper.definition.v2()
      const get = {
        'x-controller': 'controller',
        'x-operation': 'operation',
        responses: {
          200: {
            description: ''
          }
        }
      }
      definition.paths['/'] = { get }

      const enforcer = Enforcer(definition)
      enforcer.controllers({
        controller: {
          operation (req, res) {
            res.send({ a: 1 })
          }
        }
      })

      const { res } = await helper.request(enforcer, { uri: '/' })
      expect(res.statusCode).to.equal(200)
      expect(res.body).to.equal(JSON.stringify({ a: 1 }))
    })

    it('can handle object response for body when no schema', async () => {
      const definition = helper.definition.v2()
      const get = {
        'x-controller': 'controller',
        'x-operation': 'operation',
        responses: {
          200: {
            description: '',
            schema: {
              type: 'object',
              additionalProperties: { type: 'number' }
            }
          }
        }
      }
      definition.paths['/'] = { get }

      const enforcer = Enforcer(definition, { resSerialize: false, resValidate: false })
      enforcer.controllers({
        controller: {
          operation (req, res) {
            res.send({ a: 'hello' })
          }
        }
      })

      const { res } = await helper.request(enforcer, { uri: '/' })
      expect(res.statusCode).to.equal(200)
      expect(res.body).to.equal(JSON.stringify({ a: 'hello' }))
    })
  })

  describe('run manual mocks', () => {
    const schemaDef1 = {
      type: 'integer',
      minimum: 2,
      maximum: 2
    }
    const schemaDef2 = {
      type: 'integer',
      minimum: 10,
      maximum: 10
    }
    const v2Responses = {
      200: {
        description: '',
        schema: schemaDef1
      },
      201: {
        description: '',
        schema: schemaDef2
      }
    }
    const v3Responses = {
      200: {
        description: '',
        content: { 'application/json': { schema: schemaDef1 } }
      },
      201: {
        description: '',
        content: { 'application/json': { schema: schemaDef2 } }
      }
    }

    it('will not mock without specified request without auto-mocking', async () => {
      const definition = helper.definition.v3()
      definition.paths['/'].get.responses = v3Responses
      const enforcer = Enforcer(definition)
      enforcer.mocks(null, false)
      const { res } = await helper.request(enforcer)
      expect(res.statusCode).to.equal(404)
    })

    it('will mock without specified request if auto-mocking', async () => {
      const definition = helper.definition.v3()
      definition.paths['/'].get.responses = v3Responses
      const enforcer = Enforcer(definition)
      enforcer.mocks(undefined, true)
      const { res } = await helper.request(enforcer)
      expect(res.statusCode).to.equal(200)
    })

    describe('v2', () => {
      it('can use default mock from query parameter', async () => {
        const definition = helper.definition.v2()
        definition.paths['/'].get.responses = v2Responses
        const enforcer = Enforcer(definition)
        enforcer.mocks({}, false)
        const { res } = await helper.request(enforcer, { uri: '/?x-mock', json: true })
        expect(res.body).to.equal(2)
        expect(res.statusCode).to.equal(200)
      })

      it('can use default mock from header', async () => {
        const definition = helper.definition.v2()
        definition.paths['/'].get.responses = v2Responses
        const enforcer = Enforcer(definition)
        enforcer.mocks({}, false)
        const { res } = await helper.request(enforcer, { uri: '/', headers: { 'x-mock': '' }, json: true })
        expect(res.body).to.equal(2)
        expect(res.statusCode).to.equal(200)
      })

      it('can use specified status code mock from query parameter', async () => {
        const definition = helper.definition.v2()
        definition.paths['/'].get.responses = v2Responses
        const enforcer = Enforcer(definition)
        enforcer.mocks({}, false)
        const { res } = await helper.request(enforcer, { uri: '/?x-mock=201', json: true })
        expect(res.body).to.equal(10)
        expect(res.statusCode).to.equal(201)
      })

      it('can use specified status code mock from header', async () => {
        const definition = helper.definition.v2()
        definition.paths['/'].get.responses = v2Responses
        const enforcer = Enforcer(definition)
        enforcer.mocks({}, false)
        const { res } = await helper.request(enforcer, { uri: '/', headers: { 'x-mock': '201' }, json: true })
        expect(res.body).to.equal(10)
        expect(res.statusCode).to.equal(201)
      })

      it('can mock from examples mime type', async () => {
        const definition = helper.definition.v2()
        definition.paths['/'].get.produces = ['foo/cat', 'foo/dog']
        definition.paths['/'].get.responses = {
          200: {
            description: '',
            examples: {
              'foo/cat': 'Mittens',
              'foo/dog': 'Fido'
            }
          }
        }
        const enforcer = Enforcer(definition)
        enforcer.mocks({}, false)
        const { res } = await helper.request(enforcer, { uri: '/?x-mock', headers: { accept: 'foo/dog' } })
        expect(res.body).to.equal('Fido')
        expect(res.statusCode).to.equal(200)
      })

      it('can mock from schema example', async () => {
        const definition = helper.definition.v2()
        definition.paths['/'].get.responses = {
          200: {
            description: '',
            schema: { type: 'string', example: 'Hello' }
          }
        }
        const enforcer = Enforcer(definition)
        enforcer.mocks({}, false)
        const { res } = await helper.request(enforcer, { uri: '/?x-mock' })
        expect(res.body).to.equal('Hello')
        expect(res.statusCode).to.equal(200)
      })

      it('overwrites mock example with mock controller', async () => {
        const definition = helper.definition.v2()
        definition['x-controller'] = 'my-controller'
        definition.paths['/'].get['x-operation'] = 'my-operation'
        definition.paths['/'].get.responses = {
          200: {
            description: '',
            schema: { type: 'string', example: 'Hello' }
          }
        }
        const enforcer = Enforcer(definition)
        enforcer.mocks({
          'my-controller': {
            'my-operation': (req, res) => {
              res.send('mock controller')
            }
          }
        }, false)
        const { res } = await helper.request(enforcer, { uri: '/?x-mock' })
        expect(res.body).to.equal('mock controller')
        expect(res.statusCode).to.equal(200)
      })

      it('can specify to use mock example despite existing mock controller', async () => {
        const definition = helper.definition.v2()
        definition['x-controller'] = 'my-controller'
        definition.paths['/'].get['x-operation'] = 'my-operation'
        definition.paths['/'].get.responses = {
          200: {
            description: '',
            schema: { type: 'string', example: 'Hello' }
          }
        }
        const enforcer = Enforcer(definition)
        enforcer.mocks({
          'my-controller': {
            'my-operation': (req, res) => {
              res.send('mock controller')
            }
          }
        }, false)
        const { res } = await helper.request(enforcer, { uri: '/?x-mock=200,example' })
        expect(res.body).to.equal('Hello')
        expect(res.statusCode).to.equal(200)
      })

      it('can specify to use random despite existing mock controller and example', async () => {
        const definition = helper.definition.v2()
        definition['x-controller'] = 'my-controller'
        definition.paths['/'].get['x-operation'] = 'my-operation'
        definition.paths['/'].get.responses = {
          200: {
            description: '',
            schema: { type: 'string', example: 'Hello' }
          }
        }
        const enforcer = Enforcer(definition)
        enforcer.mocks({
          'my-controller': {
            'my-operation': (req, res) => {
              res.send('mock controller')
            }
          }
        }, false)
        const { res } = await helper.request(enforcer, { uri: '/?x-mock=200,random' })
        expect(res.body).not.to.be.oneOf(['Hello', 'mock controller'])
        expect(res.statusCode).to.equal(200)
      })
    })

    describe('v3', () => {
      it('can use default mock from query parameter', async () => {
        const definition = helper.definition.v3()
        definition.paths['/'].get.responses = v3Responses
        const enforcer = Enforcer(definition)
        enforcer.mocks({}, false)
        const { res } = await helper.request(enforcer, { uri: '/?x-mock', json: true })
        expect(res.body).to.equal(2)
        expect(res.statusCode).to.equal(200)
      })

      it('can use default mock from header', async () => {
        const definition = helper.definition.v3()
        definition.paths['/'].get.responses = v3Responses
        const enforcer = Enforcer(definition)
        enforcer.mocks({}, false)
        const { res } = await helper.request(enforcer, { uri: '/', headers: { 'x-mock': '' }, json: true })
        expect(res.body).to.equal(2)
        expect(res.statusCode).to.equal(200)
      })

      it('can use specified status code mock from query parameter', async () => {
        const definition = helper.definition.v3()
        definition.paths['/'].get.responses = v3Responses
        const enforcer = Enforcer(definition)
        enforcer.mocks({}, false)
        const { res } = await helper.request(enforcer, { uri: '/?x-mock=201', json: true })
        expect(res.body).to.equal(10)
        expect(res.statusCode).to.equal(201)
      })

      it('can use specified status code mock from header', async () => {
        const definition = helper.definition.v3()
        definition.paths['/'].get.responses = v3Responses
        const enforcer = Enforcer(definition)
        enforcer.mocks({}, false)
        const { res } = await helper.request(enforcer, { uri: '/', headers: { 'x-mock': '201' }, json: true })
        expect(res.body).to.equal(10)
        expect(res.statusCode).to.equal(201)
      })

      it('can mock from content example', async () => {
        const definition = helper.definition.v3()
        definition.paths['/'].get.responses = {
          200: {
            description: '',
            content: {
              'application/json': {
                schema: { type: 'string' },
                example: 'Hello'
              }
            }
          }
        }
        const enforcer = Enforcer(definition)
        enforcer.mocks({}, false)
        const { res } = await helper.request(enforcer, { uri: '/?x-mock' })
        expect(res.body).to.equal('Hello')
        expect(res.statusCode).to.equal(200)
      })

      it('can mock from named example', async () => {
        const definition = helper.definition.v3()
        definition.paths['/'].get.responses = {
          200: {
            description: '',
            content: {
              'application/json': {
                schema: { type: 'string' },
                examples: {
                  cat: { value: 'Mittens' },
                  dog: { value: 'Fido' }
                }
              }
            }
          }
        }
        const enforcer = Enforcer(definition)
        enforcer.mocks({}, false)
        const { res } = await helper.request(enforcer, { uri: '/?x-mock=200,example,dog' })
        expect(res.body).to.equal('Fido')
        expect(res.statusCode).to.equal(200)
      })

      it('can mock from schema example', async () => {
        const definition = helper.definition.v3()
        definition.paths['/'].get.responses = {
          200: {
            description: '',
            content: {
              'application/json': {
                schema: { type: 'string', example: 'Hello' }
              }
            }
          }
        }
        const enforcer = Enforcer(definition)
        enforcer.mocks({}, false)
        const { res } = await helper.request(enforcer, { uri: '/?x-mock' })
        expect(res.body).to.equal('Hello')
        expect(res.statusCode).to.equal(200)
      })

      it('overwrites mock example with mock controller', async () => {
        const definition = helper.definition.v3()
        definition['x-controller'] = 'my-controller'
        definition.paths['/'].get['x-operation'] = 'my-operation'
        definition.paths['/'].get.responses = {
          200: {
            description: '',
            content: {
              'application/json': {
                schema: { type: 'string', example: 'Hello' }
              }
            }
          }
        }
        const enforcer = Enforcer(definition)
        enforcer.mocks({
          'my-controller': {
            'my-operation': (req, res) => {
              res.send('mock controller')
            }
          }
        }, false)
        const { res } = await helper.request(enforcer, { uri: '/?x-mock' })
        expect(res.body).to.equal('mock controller')
        expect(res.statusCode).to.equal(200)
      })

      it('can specify to use mock example despite existing mock controller', async () => {
        const definition = helper.definition.v3()
        definition['x-controller'] = 'my-controller'
        definition.paths['/'].get['x-operation'] = 'my-operation'
        definition.paths['/'].get.responses = {
          200: {
            description: '',
            content: {
              'application/json': {
                schema: { type: 'string', example: 'Hello' }
              }
            }
          }
        }
        const enforcer = Enforcer(definition)
        enforcer.mocks({
          'my-controller': {
            'my-operation': (req, res) => {
              res.send('mock controller')
            }
          }
        }, false)
        const { res } = await helper.request(enforcer, { uri: '/?x-mock=200,example' })
        expect(res.body).to.equal('Hello')
        expect(res.statusCode).to.equal(200)
      })

      it('can specify to use random despite existing mock controller and example', async () => {
        const definition = helper.definition.v3()
        definition['x-controller'] = 'my-controller'
        definition.paths['/'].get['x-operation'] = 'my-operation'
        definition.paths['/'].get.responses = {
          200: {
            description: '',
            content: {
              'application/json': {
                schema: { type: 'string', example: 'Hello' }
              }
            }
          }
        }
        const enforcer = Enforcer(definition)
        enforcer.mocks({
          'my-controller': {
            'my-operation': (req, res) => {
              res.send('mock controller')
            }
          }
        }, false)
        const { res } = await helper.request(enforcer, { uri: '/?x-mock=200,random' })
        expect(res.body).not.to.be.oneOf(['Hello', 'mock controller'])
        expect(res.statusCode).to.equal(200)
      })
    })
  })
})
