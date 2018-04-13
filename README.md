# Open API Enforcer Middleware

An express middleware that makes it easy to write web services that follow an Open API specification by leveraging the tools provided in the [openapi-enforcer](https://www.npmjs.com/package/openapi-enforcer) package.

## Example

```js
const Enforcer = require('openapi-enforcer');
const express = require('express');

const schema = {
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
                    schema: { type: 'number', mininum: 1 }
                }
            ],
            get: {
                'x-operation': 'getPetById'
                responses: { ... }
            }
        },
    }
};

const options = {
    controllers: '/path/to/controllers',
    development: true
};

const enforcer = Enforcer(schema, options);
const app = express();

app.use('/v1', enforcer);
```

## Options

This module accepts the following options:



## Enforcer.prototype.middleware

An express middleware function that will map the request path to a path in the Open API document before calling the next middleware.

`Enforcer.prototype.middleware ( schema, options )`

**Parameters**

- *schema* - A file path to an OpenAPI document (either YAML or JSON) or an OpenAPI document object.

- *options* - Options that specify how the middleware should act. It has the following properties:

    - *controllers* [`string`] - Specifies the root directory to look into to find controllers. [Learn more about controllers](#)

    - *dereference* [`function`] - A `function` to call to dereference any JSON references. The `function` must return a promise that resolves to the dereferenced object. Defaults to using the [json-schema-ref-parser](https://www.npmjs.com/package/json-schema-ref-parser) dereference function.

    - *development* [`boolean`] - Set to `true` to allow invalid examples, missing controllers, and detailed response errors. When set to `false` invalid examples and missing controllers will cause the process to exit with an error code and response errors will produce a simple `500 - Internal Server Error` response Enable [debug logs](#) to see that data in the logs. Defaults to `true` if the environment variable `NODE_ENV` is not set to `"production"`.

    - *fallthrough* [`boolean`]- If a request is made to a path that is not defined in the OpenAPI document and this value is set to `true` then it will ignore the 404 status and continue on to the next middleware. If set to `false` an error with a `statusCode` property will be generated and passed to the next error handling middleware. Defaults to `true`.

    - *mockControllers* [`string`] - Specifies the root directory to look into to find controllers that produce mock responses. [Learn more about controllers](#)

    - *mockFallback* [`boolean`] - When using the [controller middleware](#) if a matching controller operation is not found then setting this value to `true` will automatically produce a response based on examples in the OpenAPI document or will randomly generate a value that adheres to the response schema. Defaults to `false`.

    - *mockHeader* [`string`] - The name of the request header to look for to enable manual mocking. If a request has this header and is executing the controllers, even if a controller is defined it will instead execute the mock and provide a mocked response. Defaults to `"x-mock"`. [Learn more about mock requests](#)

    - *mockQuery* [`string`] - The name of the request query parameter to look for to enable manual mocking. If a request has this header and is executing the controllers, even if a controller is defined it will instead execute the mock and provide a mocked response. Defaults to `"x-mock"`. [Learn more about mock requests](#)

    - *reqProperty* [`string`] - The name of the property to attach the enforcer data to on the request object. Defaults to `"openapi"`.

    - *xController* [`string`] - The name of the property within the OpenAPI document that defines the controller to use for an operation. Defaults to `"x-controller"`.

    - *xOperation* [`string`] - The name of the property within the OpenAPI document that defines the controller operation to use for an operation. Defaults to `"x-operation"` but also automatically falls back to `"operation"` regardless of what this value is set to.

Returns a middleware function with static properties [`controllers`](#) and [`use`](#) to provide flexibility in usage.

#### Basic Usage

This example will analyze incoming requests and if they match a path defined in the OpenAPI document will look for a [controller](#) within the `/path/to/controllers` directory that has the same name as that definined in the `x-controller` property of the OpenAPI document operation. [For more information, check out the detailed explanation and working example for Basic Usage.](#)

```js
const Enforcer = require('openapi-enforcer');
const express = require('express');

// define enforcer middleware
const enforcer = Enforcer('/path/to/openapi-doc.yaml', {
    controllers: '/path/to/controllers'
});

// define express app and have it use enforcer middleware
const app = express();
app.use('/v1', enforcer);
```

#### Run Middleware within the Enforcer Context

This example shows how we can add middleware to the enforcer middleware context. That means you get the enforcer information and functionality that is associated with the request. Using this method you can add regular middleware and error handling middleware. You also can still use the built in [controllers middleware](#). [For more information, check out the detailed explanation and working example for Custom Middleware within Enforcer Context.](#)

```js
const Enforcer = require('openapi-enforcer');
const express = require('express');

// define enforcer middleware
const enforcer = Enforcer('/path/to/openapi-doc.yaml');

// 1) within enforcer middleware context: run custom middleware
enforcer.use(function(req, res, next) {
    // run some code: for example, check authorization
    next();
});

// 2) within enforcer middleware context: run controllers middleware
enforcer.use(enforcer.controllers());

// 3) within enforcer middleware context: run error handling middleware
enforcer.use(function(err, req, res, next) {
    if (err.code === Enforcer.ERROR_CODE) {
        res.status(err.statusCode);
        res.send(err.message);
    } else {
        next(err);
    }
});

// add the enforcer middleware to the express app
const app = express();
app.use('/v1', enforcer);
```

