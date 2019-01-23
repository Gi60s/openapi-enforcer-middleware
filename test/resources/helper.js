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
const Request = require('request-promise-native')

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
  request: oneRequest,
  server
}

async function oneRequest (enforcer, options = {}) {
  const { app, request, start, stop } = server()
  app.use(enforcer.middleware())
  await start()
  const result = await request(options)
  await stop()
  return result
}

function server () {
  const app = express()
  let listener
  return {
    app,
    request (options = {}) {
      const port = listener.address().port
      const opts = Object.assign({
        resolveWithFullResponse: true,
        simple: false,
        baseUrl: 'http://localhost:' + port,
        uri: '/'
      }, options)
      return Request(opts)
        .then(res => {
          return { res, err: null }
        })
        .catch(err => {
          return { res: null, err }
        })
    },
    start () {
      return new Promise((resolve, reject) => {
        listener = app.listen(function (err) {
          if (err) return reject(err)
          resolve()
        })
      })
    },
    stop () {
      return new Promise((resolve, reject) => {
        listener.close(err => {
          if (err) return reject(err)
          resolve()
        })
      })
    }
  }
}
