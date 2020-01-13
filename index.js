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
const Debug = require('debug')
const Enforcer = require('openapi-enforcer')
const path = require('path')

const debug = {
  controllers: Debug('openapi-enforcer-middleware:controllers'),
  mock: Debug('openapi-enforcer-middleware:mock'),
  request: Debug('openapi-enforcer-middleware:request'),
  response: Debug('openapi-enforcer-middleware:response')
}
const enforcerVersion = require(path.resolve(path.dirname(require.resolve('openapi-enforcer')), 'package.json')).version
const ENFORCER_HEADER = 'x-openapi-enforcer'

module.exports = OpenApiEnforcerMiddleware

/**
 * Create an OpenApiEnforcerMiddleware.
 * @param {string, object} definition
 * @param {object} [options]
 * @param {array} [options.allowOtherQueryParameters]
 * @param {object} [options.componentOptions]
 * @param {boolean} [options.fallthrough=true]
 * @param {string} [options.mockHeader]
 * @param {string} [options.mockQuery]
 * @param {string} [options.reqMockProperty]
 * @param {string} [options.reqOpenApiProperty]
 * @param {string} [options.reqOperationProperty]
 * @param {boolean} [options.resSerialize=true]
 * @param {boolean} [options.resValidate=true]
 * @param {string} [options.xController]
 * @param {string} [options.xOperation]
 */
function OpenApiEnforcerMiddleware (definition, options) {
  if (!(this instanceof OpenApiEnforcerMiddleware)) return new OpenApiEnforcerMiddleware(definition, options)

  // validate and normalize options
  if (options !== undefined && (!options || typeof options !== 'object')) throw Error('Invalid option specified. Expected an object. Received: ' + options)
  if (!options) options = {}

  // get general settings
  const general = {
    allowOtherQueryParameters: options.allowOtherQueryParameters || [],
    fallthrough: options.hasOwnProperty('fallthrough') ? options.fallthrough : true,
    middleware: [],
    mockHeader: options.mockHeader || 'x-mock',
    mockQuery: options.mockQuery || 'x-mock',
    reqMockProperty: options.reqMockProperty || 'mock',
    reqOpenApiProperty: options.reqOpenApiProperty || 'openapi',
    reqOperationProperty: options.reqOperationProperty || 'operation',
    resSerialize: options.hasOwnProperty('resSerialize') ? !!options.resSerialize : true,
    resValidate: options.hasOwnProperty('resValidate') ? !!options.resValidate : true,
    xController: options.xController || 'x-controller',
    xOperation: options.xOperation || 'x-operation'
  }

  // validate general settings and store them
  if (typeof general.allowOtherQueryParameters !== 'boolean' && !isArrayOf(general.allowOtherQueryParameters, 'string')) throw Error('Configuration option "allowOtherQueryParameters" must be a boolean or an array of strings. Received: ' + general.allowOtherQueryParameters)
  if (typeof general.mockHeader !== 'string') throw Error('Configuration option "mockHeader" must be a string. Received: ' + general.mockHeader)
  if (typeof general.mockQuery !== 'string') throw Error('Configuration option "mockQuery" must be a string. Received: ' + general.mockQuery)
  if (typeof general.reqMockProperty !== 'string') throw Error('Configuration option "reqMockProperty" must be a string. Received: ' + general.reqMockProperty)
  if (typeof general.reqOpenApiProperty !== 'string') throw Error('Configuration option "reqOpenApiProperty" must be a string. Received: ' + general.reqOpenApiProperty)
  if (typeof general.reqOperationProperty !== 'string') throw Error('Configuration option "reqOperationProperty" must be a string. Received: ' + general.reqOperationProperty)
  if (typeof general.xController !== 'string') throw Error('Configuration option "xController" must be a string. Received: ' + general.xController)
  if (typeof general.xOperation !== 'string') throw Error('Configuration option "xOperation" must be a string. Received: ' + general.xOperation)
  this.options = general

  const componentOptions = options.hasOwnProperty('componentOptions') ? options.componentOptions : {}
  if (!componentOptions || typeof componentOptions !== 'object') throw Error('Configuration option "componentOptions" must be a non-null object. Received: ' + componentOptions)

  // update allowOtherQueryParameters to allow the mockQuery parameter
  if (general.allowOtherQueryParameters === false) general.allowOtherQueryParameters = []
  if (Array.isArray(general.allowOtherQueryParameters)) general.allowOtherQueryParameters.push(general.mockQuery)

  // wait for the definition to be built
  this.promise = Enforcer(definition, { fullResult: true, componentOptions })
    .then(result => {
      const [ openapi, exception, warning ] = result
      if (exception) throw Error(exception.toString())
      if (warning) console.warn(warning)
      return openapi
    })
}

OpenApiEnforcerMiddleware.prototype.controllers = function (controllersTarget, ...dependencyInjection) {
  const promise = this.promise
    .then(openapi => mapControllers(openapi, false, controllersTarget, dependencyInjection, this.options))

  this.use((req, res, next) => {
    promise
      .then(({ controllers }) => {
        const operation = req[this.options.reqOperationProperty]
        const controller = controllers.get(operation)
        if (controller) {
          res.set(ENFORCER_HEADER, 'controller')
          debug.controllers('executing controller')
          // return controller result for async error handling in express 5 and router 2.x
          // https://github.com/expressjs/express/releases/tag/5.0.0-alpha.7
          // https://github.com/pillarjs/router/tree/2.0#middleware
          return controller(req, res, next)
        } else {
          next()
        }
      })
      .catch(next)
  })

  return promise.then(({ controllers, exception }) => {
    if (exception) throw errorFromException(exception)
    return controllers
  })
}

OpenApiEnforcerMiddleware.prototype.middleware = function () {
  const extractValue = Enforcer.v3_0.Schema.extractValue // v2 and v3 extractValue is the same
  const options = this.options
  return (_req, res, _next) => {
    // store original send
    const send = res.send

    function next (err) {
      res.send = send
      if (err) return _next(err)
      _next()
    }

    this.promise
      .then(openapi => {
        // make a copy of the request to be used just within this middleware
        const req = Object.create(Object.getPrototypeOf(_req))
        Object.assign(req, _req)

        // parse, serialize, and validate request
        debug.request('validating and parsing')
        const requestObj = {
          headers: req.headers,
          method: req.method,
          path: req.originalUrl.substr(req.baseUrl.length)
        }
        if (hasBody(req)) requestObj.body = req.body
        const [ request, clientError ] = openapi.request(requestObj, { allowOtherQueryParameters: this.options.allowOtherQueryParameters })

        // 404 or 405 renders this middleware useless so exit appropriately
        if (clientError && clientError.statusCode === 404) {
          if (options.fallthrough) {
            debug.request('fallthrough')
            next()
          } else {
            res.sendStatus(clientError.statusCode)
          }
        } else if (clientError && clientError.statusCode === 405) {
          next(errorFromException(clientError))
        } else {
          // overwrite the send
          res.send = function (body) {
            res.send = send

            const code = res.statusCode || 200
            const openapi = req[options.reqOpenApiProperty]
            const operation = req[options.reqOperationProperty]
            const headers = res.getHeaders()
            const v2 = openapi.hasOwnProperty('swagger')

            // if content type is not specified for openapi version >= 3 then derive it
            if (!headers['content-type'] && !v2) {
              const [ types ] = operation.getResponseContentTypeMatches(code, req.headers.accept || '*/*')
              if (types) {
                const type = types[0]
                res.set('content-type', type)
                headers['content-type'] = type
              }
            }

            const bodyValue = openapi.enforcerData.context.Schema.Value(body, {
              serialize: options.resSerialize,
              validate: options.resValidate
            })
            const [ response, exception ] = operation.response(code, bodyValue, Object.assign({}, headers))
            if (exception) {
              res.status(500)
              return next(errorFromException(exception))
            }

            Object.keys(response.headers).forEach(header => res.set(header, extractValue(response.headers[header])))
            if (response.hasOwnProperty('body')) {
              const sendObject = response.schema && response.schema.type
                ? ['array', 'object'].indexOf(response.schema.type) !== -1
                : typeof response.body === 'object'
              res.send(sendObject ? response.body : String(response.body))
            } else {
              res.send()
            }
          }

          // store openapi instance with request object
          req[options.reqOpenApiProperty] = openapi

          const runner = middlewareRunner(options.middleware, true, req, res, next)
          if (clientError) {
            const [ value, pathError ] = openapi.path(requestObj.method, requestObj.path)
            req[options.reqOperationProperty] = pathError ? undefined : value.operation
            runner(errorFromException(clientError))
          } else {
            // store operation instance with request
            req[options.reqOperationProperty] = request.operation

            // copy deserialized and validated parameters to the request object
            req.params = request.path || {}
            ;['cookies', 'headers', 'params', 'query'].forEach(key => { req[key] = Object.assign({}, req[key], request[key]) })
            if (request.hasOwnProperty('body')) req.body = request.body

            runner()
          }
        }
      })
      .catch(next)
  }
}

OpenApiEnforcerMiddleware.prototype.mocks = function (controllersTarget, automatic = false, ...dependencyInjection) {
  const options = this.options
  let _openapi
  const promise = this.promise
    .then(openapi => {
      _openapi = openapi
      return controllersTarget
        ? mapControllers(openapi, true, controllersTarget, dependencyInjection, this.options)
        : { controllers: new Map(), exception: null }
    })

  this.use((req, res, next) => {
    promise
      .then(({ controllers }) => {
        const operation = req[this.options.reqOperationProperty]
        const controller = controllers.get(operation)
        const responseCodes = Object.keys(operation.responses)

        // check to see if using manual mock or automatic
        const mockHeaderKey = options.mockHeader
        const mockQueryKey = options.mockQuery
        let mock
        if (req.query.hasOwnProperty(mockQueryKey)) {
          mock = parseMockValue('query', responseCodes, req.query[mockQueryKey])
        } else if (req.headers.hasOwnProperty(mockHeaderKey)) {
          mock = parseMockValue('header', responseCodes, req.headers[mockHeaderKey])
        } else if (automatic) {
          mock = {
            origin: 'automatic',
            source: '',
            specified: false,
            statusCode: responseCodes[0] || ''
          }
        }

        // if skipping mock then call next middleware
        if (!mock) return next()

        const version = _openapi.swagger ? 2 : +/^(\d+)/.exec(_openapi.openapi)[0]
        const exception = new Enforcer.Exception('Unable to generate mock response')
        exception.statusCode = 400

        if (operation.responses.hasOwnProperty(mock.statusCode)) mock.response = operation.responses[mock.statusCode]
        req[options.reqMockProperty] = mock

        // if a controller is provided then call it
        if (!mock.source || mock.source === 'controller') {
          if (controller) {
            res.set(ENFORCER_HEADER, 'mock:controller')
            debug.controllers('executing mock controller')
            try {
              controller(req, res, next)
            } catch (err) {
              next(err)
            }
            return
          } else if (mock.source) {
            exception.message('A mock controller is not defined')
            return unableToMock(exception, next)
          }
        }

        // if response code is not a listed response then we have a problem
        const response = mock.response
        if (!response) {
          debug.controllers('unable to generate mock for unlisted status code')
          exception.message('No response is defined for status code: ' + mock.statusCode)
          return next(errorFromException(exception))
        }

        // version 2
        if (version === 2) {
          if (!mock.source || mock.source === 'example') {
            // to use content type specified example the produces must have example key
            if (response.hasOwnProperty('examples')) {
              const [ types ] = operation.getResponseContentTypeMatches(mock.statusCode, req.headers.accept || '*/*')
              if (types) {
                const type = types[0]
                if (response.examples.hasOwnProperty(type)) {
                  res.status(mock.statusCode)
                  const example = deserializeExample(
                    exception.nest('Unable to deserialize example'),
                    response.examples[type],
                    response.schema,
                    next
                  )
                  return res.send(example)
                }
              }
            }

            // use schema example if set
            if (response.schema && response.schema.hasOwnProperty('example')) {
              res.status(mock.statusCode)
              return res.send(copy(response.schema.example))
            }

            if (mock.source) {
              exception.message('Cannot mock from example')
              return unableToMock(exception, next)
            }
          }

          if (!mock.source || mock.source === 'random') {
            const schema = response.schema
            if (schema) {
              const [value, err, warning] = schema.random()
              if (err) {
                exception.push(err)
                return unableToMock(exception, next)
              }

              if (warning) {
                exception.push(warning)
                return unableToMock(exception, next)
              }

              res.status(mock.statusCode)
              return res.send(value)
            } else {
              exception.message('No schema associated with response')
              return unableToMock(exception, next)
            }
          }

        // version 3
        } else if (version === 3) {
          const [ types, err ] = operation.getResponseContentTypeMatches(mock.statusCode, req.headers.accept || '*/*')

          // if no content type matches then no possible mocked response
          if (err) {
            exception.push(err)
            return unableToMock(exception, next)
          }
          const type = types[0]
          const content = response.content[type]

          if (!mock.source || mock.source === 'example') {
            // named example requested
            if (mock.name) {
              if (content.examples && content.examples.hasOwnProperty(mock.name) && content.examples[mock.name].hasOwnProperty('value')) {
                res.status(mock.statusCode)
                const example = deserializeExample(
                  exception.nest('Unable to deserialize example: ' + mock.name),
                  content.examples[mock.name].value,
                  content.schema,
                  next
                )
                return res.send(example)
              } else {
                exception.message('There is no example value with the name specified: ' + mock.name)
                return unableToMock(exception, next)
              }
            }

            // select from a named example
            const exampleNames = content.examples
              ? Object.keys(content.examples).filter(name => content.examples[name].hasOwnProperty('value'))
              : []
            if (content.examples && exampleNames.length > 0) {
              const index = Math.floor(Math.random() * exampleNames.length)
              res.status(mock.statusCode)
              const example = deserializeExample(
                exception.nest('Unable to deserialize example: ' + exampleNames[index]),
                content.examples[exampleNames[index]].value,
                content.schema,
                next
              )
              return res.send(example)
            }

            // select the example
            if (content.hasOwnProperty('example')) {
              res.status(mock.statusCode)
              return res.send(copy(content.example))
            }

            // select schema example
            if (content.schema && content.schema.hasOwnProperty('example')) {
              res.status(mock.statusCode)
              return res.send(copy(content.schema.example))
            }

            // unable to mock with requested source
            if (mock.source) {
              exception.message('A mock example is not defined')
              return unableToMock(exception, next)
            }
          }

          if (!mock.source || mock.source === 'random') {
            const schema = response.content[type].schema
            if (schema) {
              const [ value, err, warning ] = schema.random()
              if (err) {
                exception.push(err)
                return unableToMock(exception, next)
              }

              if (warning) {
                exception.push(warning)
                return unableToMock(exception, next)
              }

              res.set('Content-Type', type)
              if (mock.statusCode !== 'default') res.status(+mock.statusCode)
              return res.send(value)
            } else {
              exception.message('No schema associated with response')
              return unableToMock(exception, next)
            }
          }
        }
      })
      .catch(next)
  })

  return promise.then(({ controllers, exception }) => {
    if (exception) throw errorFromException(exception)
    return controllers
  })
}

OpenApiEnforcerMiddleware.prototype.use = function (middleware) {
  if (typeof middleware !== 'function') throw Error('Invalid middleware. Value must be a function. Received: ' + middleware)
  this.options.middleware.push(middleware)
}

function copy (value) {
  if (Array.isArray(value)) {
    return value.map(copy)
  } else if (value && typeof value === 'object') {
    const result = {}
    Object.keys(value).forEach(key => {
      result[key] = copy(value[key])
    })
    return result
  } else {
    return value
  }
}

function deserializeExample (exception, example, schema, next) {
  if (isWithinVersion(null, '1.1.4')) {
    example = copy(example)
    if (schema) {
      const [ value, error ] = schema.deserialize(example)
      if (error) {
        exception.push(error)
        return unableToMock(exception, next)
      } else {
        example = value
      }
    }
    return example
  } else if (isWithinVersion('1.1.5')) {
    return example
  }
}

function exceptionPushError (exception, error) {
  const stack = error.stack
  if (stack) {
    const lines = stack.split(/\r\n|\r|\n/)
    const child = exception.nest(lines.shift())
    let line
    while ((line = lines.shift())) {
      child.message(line)
    }
  } else {
    exception.message(String(error))
  }
}

function errorFromException (exception) {
  const err = Error(exception.toString())
  err.exception = exception
  if (exception.hasOwnProperty('statusCode')) err.statusCode = exception.statusCode
  return err
}

function hasBody (req) {
  if (!req.hasOwnProperty('body')) return false
  return req.headers['transfer-encoding'] !== undefined ||
    (!isNaN(req.headers['content-length']) && req.headers['content-length'] > 0)
}

function isArrayOf (value, type) {
  if (!Array.isArray(value)) return false
  const length = value.length
  for (let i = 0; i < length; i++) {
    const t = typeof value[i]
    if (t !== type) return false
  }
  return true
}

function isNonNullObject (value) {
  return value && typeof value === 'object'
}

function isWithinVersion (versionLow, versionHigh) {
  const [c1, c2, c3] = enforcerVersion.split('.').map(v => +v)
  if (versionLow) {
    const [l1, l2, l3] = versionLow.split('.').map(v => +v)
    if (c1 < l1) return false
    if (c1 === l1 && c2 < l2) return false
    if (c1 === l1 && c2 === l2 && c3 < l3) return false
  }
  if (versionHigh) {
    const [h1, h2, h3] = versionHigh.split('.').map(v => +v)
    if (c1 > h1) return false
    if (c1 === h1 && c2 > h2) return false
    if (c1 === h1 && c2 === h2 && c3 > h3) return false
  }
  return true
}

function mapControllers (openapi, isMock, controllersTarget, dependencyInjection, options) {
  const loadedControllers = {}
  const map = new Map()
  const xController = options.xController
  const xOperation = options.xOperation
  const rootController = openapi && openapi[xController]

  // validate input
  let controllersTargetType = typeof controllersTarget
  const mockStr = isMock ? 'mock ' : ''
  if (controllersTargetType !== 'function' && controllersTargetType !== 'string' && !isNonNullObject(controllersTarget)) {
    const exception = new Enforcer.Exception('Unable to load ' + mockStr + 'controllers')
    exception.message('Controllers target must be a string, a non-null object, or a function that returns a non-null object')
    throw Error(exception.toString())
  }

  // if the controllers target is a function then execute it
  if (controllersTargetType === 'function') {
    controllersTarget = controllersTarget.apply(undefined, dependencyInjection)
    if (!isNonNullObject(controllersTarget)) {
      const exception = new Enforcer.Exception('Unable to load ' + mockStr + 'controllers')
      exception.message('Controllers target function must return a non-null object')
      throw Error(exception.toString())
    }
  }

  const controllerTargetIsString = typeof controllersTarget === 'string'
  const exception = controllerTargetIsString
    ? new Enforcer.Exception('Unable to load one or more ' + mockStr + 'directory controllers within ' + controllersTarget)
    : new Enforcer.Exception('Unable to load one or more ' + mockStr + 'controllers')

  Object.keys(openapi.paths).forEach(pathKey => {
    const pathItem = openapi.paths[pathKey]
    const pathController = pathItem[xController]

    pathItem.methods.forEach(method => {
      const operation = pathItem && pathItem[method]
      const operationController = operation && operation[xController]
      const controllerName = operationController || pathController || rootController
      const operationName = operation && (operation[xOperation] || operation.operationId)
      if (controllerName && operationName) {
        const child = exception.at(controllerName)
        let handler

        // load controller from file path
        if (controllerTargetIsString) {
          let controllerPath
          try {
            controllerPath = require.resolve(path.resolve(controllersTarget, controllerName))
          } catch (err) {
            if (err.code === 'MODULE_NOT_FOUND') {
              child.message(err.message)
            } else {
              exceptionPushError(child, err)
            }
          }

          // if not already loaded then load now
          if (controllerPath && !loadedControllers.hasOwnProperty(controllerPath)) {
            loadedControllers[controllerPath] = null
            try {
              let controller = require(controllerPath)
              if (typeof controller === 'function') controller = controller.apply(controller, dependencyInjection)
              if (!controller || typeof controller !== 'object') {
                child.message('Controller file must export a non-null object or a function that when run returns a non-null object')
              } else {
                loadedControllers[controllerPath] = controller
              }
            } catch (err) {
              exceptionPushError(child, err)
            }
          }

          if (controllerPath && loadedControllers[controllerPath]) {
            const controller = loadedControllers[controllerPath]
            if (!controller.hasOwnProperty(operationName)) {
              child.message('Operation not found: ' + operationName)
            } else {
              handler = controller[operationName]
            }
          }

        // load controller from object
        } else {
          if (!controllersTarget[controllerName]) {
            child.message('Controller not found')
          } else if (!controllersTarget[controllerName][operationName]) {
            child.message('Controller operation not found: ' + operationName)
          } else {
            handler = controllersTarget[controllerName] && controllersTarget[controllerName][operationName]
          }
        }

        // if a handler exists then validate and normalize it
        if (handler) {
          if (Array.isArray(handler)) {
            const middlewareArray = []
            const length = handler.length
            const grandChild = child.nest('Expected a function or an array of functions')
            for (let i = 0; i < length; i++) {
              const item = handler[i]
              if (typeof item !== 'function') {
                grandChild.at(i).message('Not a function')
              } else {
                middlewareArray.push(item)
              }
            }
            map.set(operation, function (req, res, next) {
              middlewareRunner(middlewareArray, false, req, res, next)()
            })
          } else if (typeof handler === 'function') {
            map.set(operation, handler)
          } else {
            child.message('Expected a function or an array of functions. Received: ' + handler)
          }
        }
      }
    })
  })

  return {
    controllers: map,
    exception: exception.hasException ? exception : null
  }
}

function middlewareRunner (store, clearEnforcerHeader, req, res, next) {
  const middlewares = store.slice(0)
  const run = err => {
    while (middlewares.length) {
      if (clearEnforcerHeader) res.removeHeader(ENFORCER_HEADER)
      const middleware = middlewares.shift()
      const isErrorHandling = middleware.length >= 4
      try {
        if (err && isErrorHandling) {
          return middleware(err, req, res, run)
        } else if (!err && !isErrorHandling) {
          return middleware(req, res, run)
        }
      } catch (e) {
        return run(e)
      }
    }
    if (clearEnforcerHeader) res.removeHeader(ENFORCER_HEADER)
    next(err)
  }
  return run
}

function parseMockValue (origin, responseCodes, value) {
  value = value.trim()
  const result = {
    origin,
    source: '',
    specified: value !== '',
    statusCode: responseCodes[0] || ''
  }
  if (value.length) {
    const ar = value.split(',')
    if (ar.length > 0) result.statusCode = ar[0]
    if (ar.length > 1) result.source = ar[1]
    if (result.source === 'example' && ar.length > 2) result.name = ar[2]
  }
  return result
}

function unableToMock (exception, next) {
  debug.controllers('unable to generate automatic mock')
  // exception.message('Unable to generate mock response')
  exception.statusCode = 501

  const err = errorFromException(exception)
  next(err)
}
