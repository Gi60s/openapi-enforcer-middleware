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
  serve,
  serveOne
}

function serve (app) {
  return new Promise((resolve, reject) => {
    const listener = app.listen(err => {
      if (err) return reject(err)

      const result = {
        port: listener.address().port,

        request: function (options) {
          const defaults = {
            baseUrl: 'http://localhost:' + result.port,
            resolveWithFullResponse: true,
            simple: false,
            json: true
          }
          const config = Object.assign(defaults, options)
          console.log('Request: ' + JSON.stringify(config))
          return request(config)
        },

        stop: () => new Promise((resolve, reject) => {
          listener.close(err => {
            if (err) return reject(err)
            resolve()
          })
        })
      }

      console.log('Test server started on port ' + result.port)
      resolve(result)
    })
  })
}

function serveOne (app, request) {
  let _server
  let _res
  return serve(app)
    .then(s => {
      _server = s
      return s.request(request)
    })
    .then(res => {
      _res = res
      return _server.stop()
    })
    .then(() => _res)
}