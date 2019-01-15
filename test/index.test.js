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
      return expect(promise).to.be.rejectedWith(/at: dne\s+Controller file not found/)
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

        const res = await helper.request(enforcer)
        expect(res.body).to.deep.equal([1, 'b', false])
      })
    })
  })

  describe('run controllers', () => {

  })
})
