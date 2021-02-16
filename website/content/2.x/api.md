---
title: API
description: API documentation for all options and methods available for the OpenAPI Enforcer Middleware.
---

## Factory (Constructor)

`OpenAPIEnforcerMiddleware (enforcerPromise: Promise<any>)`

This method is not technically a constructor function because it does not use the `new` keyword, but it performs a similar operation as a constructor and returns an object with methods you can execute.

**Parameters**

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| enforcerPromise | Promise | **REQUIRED.** An [OpenAPI Enforcer](https://www.npmjs.com/package/openapi-enforcer) promise. The easiest way to get this is to call the Enforcer factory. See the example below for details. |

**Returns** an object with the following methods:

- [docs](#docs) - Generate an endpoint for serving your OpenAPI documentation using Redoc.
- [init](#init) - Initialize the openapi-enforcer-middleware.
- [mock](#mock) - Enable fallback (automatic) mocking.
- [on](#on) - Add event listeners.
- [route](#route) - Automatically generate routes.

**Example**

```js
const enforcerPromise = Enforcer('./openapi.yml')
const enforcerMiddleware = EnforcerMiddleware(enforcerPromise)
```

## Docs

`docs (options?: DocsOptions)`

Generate an endpoint for serving your OpenAPI documentation using Redoc. This endpoint does not require that the [init](#init) middleware be called first.

**Parameters**

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| options | [Docs Options](#docs-options) | An optional parameter that describes how the docs middleware should work. |

###### Init Options

| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| padding | `string` | `0` | Specify the padding to wrap the docs page. Specifying an empty string will set the body margin and padding to defaults. Specifying any other value will set the body margin to zero and set the padding to the value specified. |
| preRedocInitScripts | `string[]` | `[]` | An array of strings for each JavaScript source to load prior to calling the Redoc init function. |
| postRedocInitScripts | `string[]` | `[]` | An array of strings for each JavaScript source to load after to calling the Redoc init function. |
| redoc | `object` | | Redoc specific options. See redoc.cdnVersion and redoc.options for details. |
| redoc.cdnVersion | `string` | | If specified then the public CDN will be used to get the redoc library with the version you've specified. If not specified then the middleware will look to see if you've installed the NPM Redoc package and will use your installed Redoc library. If not specified and you have not installed the Redoc package then it will use the `next` version off the CDN. |
| redoc.options | `object` | | Options to pass directly to the redoc library during initialization. |
| styleSheets | `string[]` | | An array of strings for each CSS href to load in the head of the HTML. |
| title | `string` | | The HTML title for the page. Defaults to the title specified in the OpenAPI document info.title property with the exception that if that title is a blank string then it will use `"API Documentation"` as the title. |

**Example**

```js
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('openapi-enforcer-middleware')
const express = require('express')

const app = express()

const enforcerMiddleware = EnforcerMiddleware(Enforcer('./openapi.yml'))

// visiting http://<your-server.com>/docs will show the docs
app.use('/docs', enforcerMiddleware.docs({
  padding: 0,
  preRedocInitScripts: ['/before-init.js'],
  postRedocInitScripts: ['/after-init.js'],
  redoc: {
    cdnVersion: 'next',
    options: {}
  },
  styleSheets: ['/my-css.css'],
  title: 'My API'
}))
```

## Init

`init (options?: InitOptions)`

Initialize the middleware. You need to call this function as an express middleware prior to the routes that you want to validate but after any body parsing middleware you want to add.

**Parameters**

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| options | [Init Options](#init-options) | An optional parameter that describes how the init middleware should work. |

###### Init Options

| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| allowOtherQueryParameters | `boolean` or `string[]` | `false` | A boolean or string array. If a boolean, `true` indicates that any query parameters (even those not defined in your OpenAPI spec) are allowed. Using `false` indicates that no query parameters outside of those defined in your OpenAPI spec are allowed. Specifying an array of strings specifies what specific query parameters are allowed outside of your OpenAPI spec. |
| handleBadRequest | `boolean` | `true` | How to handle invalid requests. If `true` a 400 response is sent back automatically. This means that a route you've defined will not be called when the request is invalid. If `false` and the request was invalid then your route will still execute but the `enforcer` property will not be set on the `req` and `res` objects. |
| handleBadResponse | `boolean` | `true` | How to handle invalid responses. If `true` a 500 response is sent back automatically, if `false` the next middleware is called with the error and the error will be logged to the console. |
| handleNotFound | `boolean` | `true` | How to handle requests for paths that do not exist. If `true` a 404 response is sent back automatically, if `false` the `enforcer` property is not set on the `req` and `res` objects. |
| handleMethodNotAllowed | `boolean` | `true` | How to handle method not allowed. If `true` a 405 response is sent back automatically, if `false` the `enforcer` property is not set on the `req` and `res` objects. |
| mockHeader | `string` | `"x-mock"` | The name to use for the mocking header. Set to an empty string to disable mock requests via the header. [Learn about mocking.](./mocking) |
| mockQuery | `string` | `"x-mock"` | The name to use for the mocking query parameter. Set to an empty string to disable mock requests via the query parameter. (The value specified will automatically be added to the `allowedOtherQueryParameters`.) [Learn about mocking.](./mocking) |
| mockStore | [MockStore](./mocking#mock-store) | [CookieStore](./mocking) | This mock store to use if the request is an implemented mock request. [Learn about mocking.](./mocking) |
| xMockImplemented | `string` | `x-mock-implemented` | The name of the OpenAPI extension property that identifies if the operation has a mock response implemented in your code. [Learn about mocking.](./mocking) |

**Returns** an express middleware function.

**Example**

```js
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('openapi-enforcer-middleware')
const express = require('express')

const app = express()

const enforcerMiddleware = EnforcerMiddleware(Enforcer('./openapi.yml'))
const initOptions = {
  allowOtherQueryParameters: false,
  handleBadRequest: true,
  handleBadResponse: true,
  handleNotFound: true,
  handleMethodNotAllowed: true,
  mockHeader: 'x-mock',
  mockQuery: 'x-mock',
  mockStore: cookieStore,
  xMockImplemented: 'x-mock-implemented'
}
app.use(enforcerMiddleware.init(initOptions))

// add paths and start server listening...
```

## Mock

`mock ()`

This function enables fallback (automatic) mocking. This is useful if your API is in development and you've written your OpenAPI spec but have yet to write all of the code to implement the endpoints. Fallback mocking will pick up any requests for endpoints that have not yet been implemented and will automatically generate responses to send back.

**Parameters**

None

**Returns** an express middlware.

**Example**

You'll want to add the fallback mocking middleware after your routes, otherwise it will handle all requests and your routes will never get called.

```js
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('openapi-enforcer-middleware')
const express = require('express')

const app = express()

const enforcerMiddleware = EnforcerMiddleware(Enforcer('./openapi.yml'))

// initialize enforcer middleware
app.use(enforcerMiddleware.init())

// add your implemented routes here
app.get('/', (req, res) => {
  res.enforcer.send('OK')
})

// add fallback mocking middleware here
app.use(enforcerMiddleware.mock())

app.listen(3000)
``` 

## On

`on (type: string, handler: Function)`

Add an event listener. Currently, only the [route](#route) middleware emits events.

**Parameters**

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| type | `string` | The type of event to listen for. |
| handler | `Function` | The function to call when the event occurs. |

**Returns** nothing.

## Route

`route (controllersDirectory: string, depdendencies?: Array | Object, options?: RouteOptions`)`

Automatically generate routes based on your OpenAPI document. This is done by specifying an `x-controller` and `x-operation` properties in your OpenAPI document and then telling this route middleware where to look to link those values to executable code.

The big advantage of using this middleware is that you don't have to update your express routes manually when your OpenAPI document changes.

To fully understand how this works, check out the [Route Builder](./route-builder) documentation.

**Parameters**

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| controllersDirectory | `string` | The directory path that contains your controller files. | 
| dependencies | `Array` or `Object` | Dependencies to inject into your controller factories. Learn more about this on the [Route Builder page](./route-builder#dependency-injection). |
| options | [Route Options](#route-options) | An optional parameter that can define how the route builder works. |

###### Route Options

| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| commonDependencyKey | `string` | `common` | If using mapped dependencies then this is the mapping name for common dependencies. Learn more about this on the [Route Builder page](./route-builder#dependency-injection). |
| lazyLoad | `boolean` | `false` | Whether to lazy load your controllers. Lazy loading will reduce how long it takes to start your app (although probably not by much) at the cost of having to load each controller the first time it is requested. |
| xController | `string` | `x-controller` | The name of the property to look for in your OpenAPI document to specify the controller to use for an operation. |
| xOperation | `string` | `x-operation` | The name of the property to look for in your OpenAPI document to specify the controller's operation to use for an operation. The OpenAPI property `operationId` can be used in place of this value. |

**Returns** an express middleware.

**Example**

This example won't make much sense on its own. Check of the [Route Builder](./route-builder) documentation for more details.

```js
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('openapi-enforcer-middleware')
const express = require('express')

const app = express()

const enforcerMiddleware = EnforcerMiddleware(Enforcer('./openapi.yml'))

// initialize enforcer middleware
app.use(enforcerMiddleware.init())

// add route builder middleware
app.use(enforcerMiddleware.route('./controllers'))

app.listen(3000)
```
