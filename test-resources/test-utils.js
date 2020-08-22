const Enforcer = require('openapi-enforcer')
const express = require('express')
const http = require('http')
const Middleware = require('../dist')


exports.openapi = function (version) {
  const store = {
    paths: []
  }

  function build () {
    const result = {
      info: { title: '', version: '' },
      paths: {}
    }
    if (version === 2) {
      result.swagger = '2.0'
    } else {
      result.openapi = '3.0.0'
    }

    store.paths.forEach(path => {
      result.paths[path.path] = path.build()
    })

    return result
  }

  return {
    addPath (path) {
      const p = {
        path,
        parameters: [],
        operations: [],
        build () {
          const result = {}
          this.parameters.forEach(param => {
            if (!result.parameters) result.parameters = []
            result.parameters.push(createParameter(param))
          })
          this.operations.forEach(operation => {
            result[operation.method] = operation.build()
          })
          return result
        }
      }
      store.paths.push(p)
      const pathFactory = {
        addParameter (name, inPos, schema) {
          p.parameters.push({ name, in: inPos, schema })
          return pathFactory
        },
        addOperation (method) {
          const o = {
            body: null,
            method,
            parameters: [],
            responses: {},
            build () {
              const result = { responses: {} }
              this.parameters.forEach(param => {
                if (!result.parameters) result.parameters = []
                result.parameters.push(createParameter(param))
              })

              const codes = Object.keys(this.responses)
              if (!codes.length) {
                result.responses[200] = { description: '' }
              } else {
                codes.forEach(code => {
                  const builtResponse = { description: '' }
                  if (version === 2) {
                    const { schema, example } = this.responses[code]
                    if (schema) builtResponse.schema = schema
                    if (example) builtResponse.example = example
                  } else {
                    const types = Object.keys(this.responses[code])
                    builtResponse.content = {}
                    types.forEach(type => {
                      const { schema, example } = this.responses[code]
                      const builtContent = {}
                      if (example) builtContent.example = example
                      if (schema) builtContent.schema = schema
                      builtResponse.content[type] = builtContent
                    })
                  }
                })
              }
              return result
            }
          }
          p.operations.push(o)
          const operationFactory = {
            addParameter (name, inPos, schema) {
              o.parameters.push({ name, in: inPos, schema })
              return operationFactory
            },
            addBody (schema) {
              o.body = schema
              return operationFactory
            },
            addResponse (code, schema, example, contentType = 'application/json') {
              if (version === 2) {
                o.responses[code] = { example, schema }
              } else {
                if (!o.responses.hasOwnProperty(code)) o.responses[code] = {}
                o.responses[code][contentType] = { example, schema }
              }
              return operationFactory
            },
            build,
            path: pathFactory
          }
          return operationFactory
        },
        build
      }
      return pathFactory
    },
    build
  }

  function createParameter (param) {
    const result = {
      name: param.name,
      in: param.in,
      schema: param.schema
    }
    if (param.in === 'path') param.required = true
    return result
  }
}

exports.server = function (options) {
  const app = express()
  let listener

  if (!options) options = {}
  if (!options.doc) throw Error('Missing require options.doc property')
  if (!options.hasOwnProperty('initEnforcer')) options.initEnforcer = {}

  const enforcerPromise = Enforcer(options.doc)

  app.use(express.json())
  if (options.initEnforcer) app.use(Middleware.init(enforcerPromise, options.initEnforcer))

  function request (options) {
    if (!options) return Promise.reject(Error('Missing required options parameter'))
    if (!options.method) return Promise.reject(Error('Missing required options.method property'))
    if (!options.path) return Promise.reject(Error('Missing required options.path property'))

    return new Promise((resolve, reject) => {
      // define request options
      const opts = {
        headers: options.headers || {},
        host: 'localhost',
        method: options.method.toUpperCase(),
        path: options.path,
        port: listener.address().port
      }
      if (options.body) {
        if (typeof options.body === 'object' && !options.headers['content-type']) {
          options.headers['content-type'] = 'application/json'
        }
      }

      // make request
      const req = http.request(opts, res => {
        const result = {
          body: '',
          statusCode: res.statusCode,
          headers: res.headers,
        }

        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          result.body += chunk
        })
        res.on('end', () => {
          if (res.headers['content-type'] === 'application/json') {
            result.body = JSON.parse(result.body)
          }
          resolve(result)
        })
      })

      req.on('error', reject)

      // write body
      if (options.body) {
        if (typeof options.body === 'object') {
          req.write(JSON.stringify(options.body))
        } else {
          req.write(options.body)
        }
      }

      // send request
      req.end()
    })
  }

  function start () {
    if (listener) return Promise.resolve()
    return new Promise((resolve, reject) => {
      listener = app.listen(err => {
        if (err) {
          listener = null
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  function stop () {
    if (listener) {
      listener.close()
      listener = null
    }
  }

  return {
    app,
    request,
    start,
    stop
  }
}