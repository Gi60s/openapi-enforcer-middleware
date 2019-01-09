# Open API Enforcer Middleware

An express middleware that makes it easy to write web services that follow an Open API specification by leveraging the tools provided in the [openapi-enforcer](https://www.npmjs.com/package/openapi-enforcer) package.

## Features

- Supports OpenAPI (Swagger) 2.0 and 3.x
- Express middleware
- Automatically link JavaScript functions to path endpoints
- Parses and validates incoming requests
- Validates responses prior to sending
- Automatic response mocking in development
- Option for manual response mocking in production
- Highly configurable
- Accepts middleware plugins

## Installation

This package has [openapi-enforcer](https://www.npmjs.com/package/openapi-enforcer) as a peer dependency, so both must be installed.

```bash
npm install openapi-enforcer openapi-enforcer-middleware
```

// TODO: document how operation can be a function or an array of functions

## Example

```js
const EnforcerMiddleware = require('openapi-enforcer-middleware');
const express = require('express');

const app = express();

// Open API Specification document definition
const definition = {
    openapi: '3.0.0',
    info: { title: 'Pet Store', version: 'v1' },
    paths: {
        '/pets/{id}': {
            'x-controller': 'pets',
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'number', minimum: 1 }
                }
            ],
            get: {
                'x-operation': 'getPetById',
                responses: { ... }
            }
        },
    }
};

// create the enforcer middware instance
const enforcer = EnforcerMiddleware(definition, {
    controllers: '/path/to/controllers',
    development: true
});

// if the middleware fails to load then exit
enforcer.promise.catch(err => {
    console.error(err.stack);
    process.exit(1)
});

// respond with mock data for specific mock requests
enforcer.mocks('/path/to/mock/controllers', false);

// respond with real data
enforcer.controllers('/path/to/real/controllers');

// respond with mock data
enforcer.mocks('/path/to/mock/controllers', true);


app.use('/v1', enforcer.middleware());
```

## Enforcer

An express middleware function that will map the request path to a path in the Open API document before calling the next middleware.

`Enforcer ( schema, options )`

**Parameters**

- *schema* - A file path to an OpenAPI document (either YAML or JSON) or an OpenAPI document object.

- *options* - Options that specify how the middleware should act. It has the following properties:

    - *controllers* [`string`] - Specifies the root directory to look into to find controllers. [Learn more about controllers](#controllers)

    - *dereference* [`function`] - A `function` to call to dereference any JSON references. The `function` must return a promise that resolves to the dereferenced object. Defaults to using the [json-schema-ref-parser](https://www.npmjs.com/package/json-schema-ref-parser) dereference function.

    - *development* [`boolean`] - Set to `true` to:

        1. Get detailed response messages when 500 errors occur

        2. Allow missing controllers

        3. Enable mockFallback by default

        4. Allow examples not to match their schema

        Defaults to development if the environment variable `NODE_ENV` is not set to `"production"`.

    - *fallthrough* [`boolean`] - If a request is made that this middleware does not handle (404) and this value is set to `true` then the request will be passed to the next middleware. If set to `false` an error with a `statusCode` property will be generated and passed to the next error handling middleware. Defaults to `true`.

    - *mockControllers* [`string`] - Specifies the root directory to look into to find controllers that produce mock responses. [Learn more about controllers](#controllers)

    - *mockEnabled* [`boolean`] - If set to `true` then manual mocking is enabled. Defaults to `true` if the `controllers` option has been specified, otherwise it defaults to `false`. [Learn more about mocks](#mock-responses)

    - *mockFallback* [`boolean`] - If set to `true` then mock responses will be generated if an actual response is not provided. If [`NODE_ENV=production`](#development-vs-production) then this value defaults to `false`, otherwise it defaults to `true`.

    - *mockHeader* [`string`] - The name of the request header to look for to trigger manual mocking. If a request has this header and the `mockEnabled` option is set to `true` then a mock response will take precedence to a controller's response. Defaults to `"x-mock"`. [Learn more about mocks](#mock-responses)

    - *mockQuery* [`string`] - The name of the request query parameter to look for to trigger manual mocking. If a request has this header and the `mockEnabled` option is set to `true` then a mock response will take precedence to a controller's response. Defaults to `"x-mock"`. [Learn more about mocks](#mock-responses)

    - *reqProperty* [`string`] - The name of the property to attach the enforcer data to on the request object. Defaults to `"openapi"`.

    - *xController* [`string`] - The name of the property within the OpenAPI document that defines the controller to use for an operation. Defaults to `"x-controller"`.

    - *xOperation* [`string`] - The name of the property within the OpenAPI document that defines the controller operation to use for an operation. Defaults to `"x-operation"` but also automatically falls back to `"operationId"` regardless of what this value is set to.

Returns a middleware function with static properties [`controllers`](#controllers-middleware) and [`use`](#custom-middleware) to provide flexibility in usage.

## Usage

The following example will do the following with each incoming request:

1. Check to see if manual mocking has been requested and if so provide a mock response, otherwise...
2. Call the [controller function](#controllers) associated with the request if defined, otherwise...
3. Will produce a mock response if in [development mode](#development-vs-production), otherwise...
4. Call the next middleware.

```js
const Enforcer = require('openapi-enforcer-middleware');
const express = require('express');

const app = express();

// define enforcer middleware
const enforcer = Enforcer('/path/to/openapi-doc.yaml', {
    controllers: '/path/to/controllers'
});

// call openapi enforcer middleware
app.use(enforcer);
```

The example above is equivalent to the following advanced usage example. Advanced usage allows you specify exactly what middleware to run in the enforcer middleware context. Middleware run in the enforcer context works the same as normal express middleware except that responses will be validated.

```js
const Enforcer = require('openapi-enforcer-middleware');
const express = require('express');

const app = express();

// define enforcer middleware
const enforcer = Enforcer('/path/to/openapi-doc.yaml');

// add middlewares to enforcer
enforcer.use(enforcer.mock({ automatic: false });
enforcer.use(enforcer.controllers({ controllers: '/path/to/controllers' });
enforcer.use(enforcer.mock({ automatic: true });

// call openapi enforcer middleware
app.use(enforcer);
```

### Controllers Middleware

The controllers middleware is the middleware that ties the [`x-controller` and `x-operation` in the Open API document](#controllers) to actual code.

`enforcer.controllers ( options )`

**Parameters**

- *options* [`object`] - Options that specify how the middleware should act. It has the following properties:

    - *controllers* [`string`] - **REQUIRED** The directory path to look into to find controllers.

    - *fallthrough* [`boolean`] - If the middleware doesn't handle the path then continue on to the next middleware, otherwise produces an error response that signals the functionality has not yet been implemented.

Returns a middleware function.

```js
const enforcer = Enforcer('/path/to/openapi-doc.yaml');
enforcer.use(enforcer.controllers({
    controllers: '/path/to/controllers'
}));
```

### Mock Middleware

This middleware is used to produce mock responses.

`enforcer.mock ( options )`

**Parameters**

- *options* [`object`] - The mock middleware options.

    - *automatic* [`boolean`] - Set to `true` to send a mock response whether it was requested or not. If set to `false` then mock responses will only occur when specificially requested. Defaults to `false`.

    - *controllers* [`string`] - The directory path to look into to find mock controllers.

Returns a middleware function.

### Custom Middleware

Define middleware that should run in the context of the enforcer.

`enforcer.use ( [ path, ] middleware )`

**Parameters**

- *path* [`string`] - A static URL subpath to match before running the provided function middleware. Defaults to `"/"`.

- *middleware* [`function`] - A function that is either middleware or error handling middleware. Can also be the [controllers middleware](#controllers-middleware) because that too is just normal middleware.

Returns `undefined`.

```js
const enforcer = Enforcer('/path/to/openapi-doc.yaml');

enforcer.use(function(req, res, next) {
    // run some code
    next();
});

enforcer.use(function(err, req, res, next) {
    // handle the error or pass it along
    ...
});
```

## Controllers

Your Open API document can specify which JavaScript function to use for a specific path and method. This is done be defining the `x-controller` and `x-operation` (or `operationId`) properties within the Open API document. (Note, the property name used for `x-controller` and `x-operation` can be changed by specifying a different value by using the option parameter of the [enforcer](#enforcer) function.)

There are three steps to making this work:
1. [Tell the Enforcer where to find your controllers](#tell-the-enforcer-where-to-find-your-controllers)
2. [Specify controllers in your Open API document](#specify-controllers-in-your-open-api-document)
3. [Create a controller file](#create-a-controller-file)

### Tell the Enforcer Where to Find Your Controllers

You can specify the path for normal controllers and [mock controllers](#mock-responses) when you call the [enforcer function](#enforcer).

```js
const Enforcer = require('openapi-enforcer');
const express = require('express');

const enforcer = Enforcer('/path/to/openapi-document.yaml', {
    controllers: '/path/to/controllers',
    mockControllers: '/path/to/mockControllers'
});

const app = express();
app.use(enforcer);
```

### Specify Controllers in Your Open API Document

Within your Open API document you can associate a function to call for a specific path operation (path and method). This is accomplished by defining the `x-controller` and the `x-operation` properties for the desired path operation.

The `x-controller` property is the path to the JavaScript file in your controllers directory. This can include a path and optionally a file name extension.

The `x-controller` property can be defined 1) at the root of your document, 2) within a path, and 3) within an operation. The operation controller has precedence, followed by the path controller, then the global controller.

In the following partial example of an OpenAPI document you can see that the `x-controller` is specified at three levels. In this case `"controllerC"` will be used if a request goes to `GET /`, `"controllerB"` will be used if request is a `POST /`, and `"controllerA"` will be used if the request is to `GET /alt`.

```yaml
x-controller: controllerA
paths: {
  /:
    x-controller: controllerB
    get:
      x-controller: controllerC
      x-operation: functionC
      ...
    post:
      x-operation: functionB
      ...
  /alt:
    get:
      x-operation: functionA
      ...
```

The `x-operation` property is the name of the function (within the controller) that should be executed. (Note that `operationId` can be used in place of the `x-operation` property but that `x-operation` has higher priority.)

### Create a Controller File

Create a JavaScript file in your controllers directory. Give the JavaScript file the same name (or path) as that defined in your `x-controller` property. For example, if your Open API document specifies that `x-controller` equals `"controllerA"` then this package will look into the controllers directory for the file `controllerA.js`.

**controllerA.js**

```js
exports.functionA = function(req, res, next) {
    // run your code here
    // 1) req has already been parsed and validated
    // 2) when you use res.send() the response body and headers will be validated and serialized
    // 3) call next() if you don't want to handle the request in the controller.
}
```

## Development and Production

This middleware uses the `NODE_ENV` environment variable (as popularized by the [express package](https://www.npmjs.com/package/express)) to determine if it is being run in production or development.

If the `NODE_ENV=production` then the following will apply:

- All examples within the OpenAPI document must be valid, otherwise the application will throw an error.
- All controllers and operation endpoints must exist, otherwise the application will throw an error.
- Invalid responses will return a `500` status code with a generic `Internal Server Error` message.

If the `NODE_ENV` is not set to `production` then:

- Invalid examples will produce warnings to the console but the application will still start.
- Missing controllers or operation endpoints will produce warnings to the console but the application will still start.
- Invalid responses will return a `500` status code with the complete error stack trace.

## Debug Logs

The logging for this package and for the [Open API Enforcer package](https://www.npmjs.com/package/openapi-enforcer) primarily comes through the [Debug package](https://www.npmjs.com/package/debug).

To enable debugging add the environment variable `DEBUG=openapi-enforcer*`

## Mock Responses

Producing mock responses is useful during the development of your API or during the development of clients that use your API. This package provides several ways to use mocks.

### When Mocks Occur

An HTTP request can [specifically request mock data](#manual-mocking) using either the mock query parameter or mock header. The name of the header and query parameter is defined via the [options parameter](#enforcer) when you create your enforcer middleware and defaults to `"x-mock"`. To disable manual mocking you can set the [options parameter](#enforcer) `mockHeader` and `mockQuery` values to an empty string.

An mock will occur automatically if the [options parameter](#enforcer) `mockFallback` is set to `true` and there is no [controller function](#controllers) to execute when the [controllers middleware](#controllers-middleware) executes.

### How Mocking Occurs

Mocking can occur via one of three ways and always occurs in this order. If one does not fulfill the mock request then the next one will be used.

1. Mock via a mock controller. This is a controller that has been set up to receive mock requests.

2. Mock via example. If the Open API document has an example (or examples) listed for the response then the example will be returned.

3. Mock via schema. A randomly generated example will be returned that adheres to the response schema.

### Manual Mocking

When using the mock header or mock query parameter the value can define the response status code (and optional example name) to use for the mocked response. If the header or query parameter value is empty then the first response code and a random example will be returned.

Here are some examples to demonstrate the usage of these parameters:

- `x-mock: 200` will return a mock of the 200 response code
- `x-mock: 201` will return a mock of the 201 response code
- `x-mock: 200,cat` will return a mock of the 200 response code's `cat` example. This only works for Open API 3.0.0 and newer.
- `x-mock: 200,*` will return a randomly generated 200 response. Any example defined in the Open API document will be ignored.