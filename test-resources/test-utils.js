const Enforcer = require('openapi-enforcer')
const express = require('express')
const http = require('http')
const Middleware = require('../dist')
const path = require('path')
const util = require('../dist/util2')

exports.copy = util.copy

exports.ok = () => {
  return function (req, res) {
    res.send('ok')
  }
}

exports.on = function (mw, type, options = { timeout: 1000, count: -1 }) {
  return new Promise((resolve, reject) => {
    const results = []
    setTimeout(() => {
      if (options.count === -1) {
        resolve(results)
      } else if (results.length !== options.count) {
        reject(Error('Timeout: Took too long to receive all events. Received ' + results.length + ' out of ' + count + '.'))
      }
    }, options.timeout)
    mw.on(type, (value) => {
      results.push(value)
      if (results.length === options.count) resolve(results)
    })
  })
}

exports.spec = {
  openapi (opts) {
    opts = standardizeSpecOptions(opts)
    const result = {
      openapi: '3.0.0',
      info: { title: '', version: '' },
      paths: {}
    }
    return buildPaths(result, opts, 3)
  },

  swagger (opts) {
    opts = standardizeSpecOptions(opts)
    const result = {
      swagger: '2.0',
      info: { title: '', version: '' },
      paths: {}
    }
    return buildPaths(result, opts, 2)
  }
}

exports.test = async function (options, handler) {
  const server = exports.server(options)
  await server.start()
  await handler(server.request, server)
  server.stop()
}

/**
 *
 * @param {object} options
 * @param {object} options.doc
 * @param {boolean|object} [options.initEnforcer=true]
 * @param {boolean} [options.fallbackMocking=false]
 * @param {object} [options.routeBuilder]
 * @param {function} [options.routeHook]
 * @returns {{ app: Express, enforcerPromise: Promise, enforcerMiddleware: *, request: function, stop: function, start: function }}
 */
exports.server = function (options) {
  const app = express()
  let listener

  if (!options) options = {}
  if (!options.doc) throw Error('Missing require options.doc property')
  if (!options.hasOwnProperty('initEnforcer') || options.initEnforcer === true) options.initEnforcer = {}

  const enforcerPromise = Enforcer(options.doc)
  const mw = Middleware(enforcerPromise)

  app.use(express.text())
  app.use(express.json())
  app.use((req, res, next) => {
    next() // a place to set a debug breakpoint
  })
  if (options.initEnforcer) app.use(mw.init(options.initEnforcer))
  if (options.routeBuilder) {
    const controllerDirectory = path.resolve(__dirname, 'controllers')
    const dependecies = options.routeBuilder.dependencies
    app.use(mw.route(controllerDirectory, dependecies, options.routeBuilder))
  }
  if (options.routeHook) options.routeHook(app, mw)
  if (options.fallbackMocking) app.use(mw.mock())

  function request (options) {
    if (!options) return Promise.reject(Error('Missing required options parameter'))
    if (!options.method) options.method = 'get'
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
        if (!opts.headers['content-type']) {
          if (typeof options.body === 'object') {
            opts.headers['content-type'] = 'application/json'
          } else if (typeof options.body === 'string') {
            opts.headers['content-type'] = 'text/plain'
          }
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
          if (res.headers['content-type'].indexOf('application/json') === 0) {
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
    enforcerPromise,
    enforcerMiddleware: mw,
    request,
    start,
    stop
  }
}



function buildPaths (doc, opts, version) {
  opts.forEach(opt => {
    if (!doc.paths[opt.path]) doc.paths[opt.path] = {}
    const path = doc.paths[opt.path]

    if (!path[opt.method]) path[opt.method] = {}
    const operation = path[opt.method]

    if (opt.parameters) operation.parameters = opt.parameters
    if (opt.responses) {
      if (!operation.responses) operation.responses = {}
      const responses = operation.responses
      opt.responses.forEach(res => {
        const response = responses[res.code] = { description: '' }
        if (version === 2) {
          if (res.type) {
            if (!operation.produces) operation.produces = []
            operation.produces.push(res.type)
          }
          if (res.example) {
            response.examples = {
              [res.type || 'application/json']: res.example
            }
          } else if (res.examples) {
            response.examples = res.examples
          }
          if (res.headers) response.headers = res.headers
          if (res.schema) response.schema = res.schema
        } else if (version === 3) {
          if (res.schema || res.example || res.examples || res.headers) {
            const content = response.content = {}
            const type = content[res.type || 'application/json'] = {}
            if (res.example) type.example = res.example
            if (res.examples) {
              const results = {}
              Object.keys(res.examples).forEach(name => {
                results[name] = { value: res.examples[name] }
              })
              type.examples = results
            }
            if (res.headers) type.headers = res.headers
            if (res.schema) type.schema = res.schema
          }
        }
      })
    } else {
      operation.responses = { 200: { description: '' } }
    }
  })
  return doc
}

function standardizeSpecOptions (opts) {
  if (!opts) opts = []
  if (opts.length === 0) opts[0] = {}
  opts.forEach(opt => {
    if (!opt.path) opt.path = '/'
    if (!opt.method) opt.method = 'get'
    // if (!opt.responses) opt.responses = []
    // if (opt.responses.length === 0) opt.responses[0] = {}
    // opt.responses.forEach(res => {
    //
    // })
  })
  if (!opts.path) opts.path = '/'
  if (!opts.method) opts.method = 'get'
  return opts
}