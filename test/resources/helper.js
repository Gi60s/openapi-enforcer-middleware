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
'use strict'
const express = require('express')
const request = require('request-promise-native')

module.exports = {
  definition: {
    v2: () => {
      return {
        swagger: '2.0',
        info: { title: '', version: '' },
        paths: {
          '/': {
            get: {
              responses: {
                200: { description: '' }
              }
            }
          }
        }
      }
    },
    v3: () => {
      return {
        openapi: '3.0.0',
        info: { title: '', version: '' },
        paths: {
          '/': {
            get: {
              responses: {
                200: { description: '' }
              }
            }
          }
        }
      }
    }
  },
  request: oneRequest
}

function oneRequest (enforcer, options = {}) {
  return new Promise((resolve, reject) => {
    const app = express()
    app.use(enforcer.middleware())
    const listener = app.listen(function (err) {
      if (err) reject(reject)
      const port = listener.address().port
      options = Object.assign({
        baseUrl: 'http://localhost:' + port,
        uri: '/'
      }, options)
      Request(options)
        .then(res => {
          listener.close()
          resolve(res)
        })
        .catch(err => {
          listener.close()
          reject(err)
        })
    })
  })
}