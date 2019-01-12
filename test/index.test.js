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
const expect = require('chai').expect

/* global describe it */
describe('openapi-enforcer-middleware', () => {
  describe('map controllers', () => {
    describe('missing controller files', () => {
      it('warns in development', () => {
        throw Error('TODO')
      })

      it('throws error in production', () => {
        throw Error('TODO')
      })
    })

    describe('controller operations', () => {
      it('warns in development if missing', () => {
        throw Error('TODO')
      })

      it('throws error in production if missing', () => {
        throw Error('TODO')
      })

      it('can be a function', () => {
        throw Error('TODO')
      })

      it('can be an array of functions', () => {
        throw Error('TODO')
      })

      it('can be an empty array', () => {
        throw Error('TODO')
      })

      it('cannot be an array with item not as function', () => {
        throw Error('TODO')
      })

      it('cannot be an object', () => {
        throw Error('TODO')
      })
    })
  })

  describe('in memory controllers', () => {
    it('allows a controller map to be specified', () => {
      // this refers to not specifying a controller file path but rather an object containing the already built controller map
      throw Error('TODO')
    })
  })
})
