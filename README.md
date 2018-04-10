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
                responses: { ... }
            }
        },
    }
};

const enforcer = new Enforcer(schema);
const app = express();

app.use('/v1', enforcer.middleware({
    controllers: '/path/to/controllers',
    development: true,
    invalid: function(err, req, res, next) {
        res.status(400);
        res.send(err.message);
    },
    mock: 'mock',
    reqProperty: 'openapi',
    valid: function(req, res, next) {
        const id = req.params.id;   // => params parsed to match schemas
    })
});
```

## Options

This module accepts the following options:



## Enforcer.prototype.middleware

An express middleware function that will map the request path to a path in the Open API document before calling the next middleware.

`Enforcer.prototype.middleware ( schema, options )`

**Parameters**

- *schema* - A file path to an OpenAPI document (either YAML or JSON) or an OpenAPI document object.

- *options* - Options that specify how the middleware should act. It has the following properties:

    - *controllers* - A `string` specifying the directory to look at to find path controllers. [Details](#controllers)

    - *dereference* - A `function` to call to dereference any JSON references. Must return a promise that resolves to the dereferenced object. Defaults to using [json-schema-ref-parser](https://www.npmjs.com/package/json-schema-ref-parser) dereference function. [Details](#dereference)

    - *invalid* - An error middleware `function` or a `boolean` that defines how invalid client requests or server responses should be handled. If set to `true` then this middleware will automatically send an appropriate response to the client. If set to `false` the next error middleware will be called. [Details](#invalid)

    - *mockProperty* - A `string`, a `boolean`, or an `object`. Defaults to `"x-mock"`.

        Use a `string` to specify the name of the query parameter and header to look for for manual mocking. Use `false` to disable manual mocking. Use `true` to use `"x-mock"` as the query parameter or header name. Use an `object` with properties `header` and/or `query` to specify the name for header and query string separately.

        ```js

        ```



| Parameter | Description | Type |
| --------- | ----------- | ---- |
| schema | The file path to an OpenAPI document or an object that is an OpenAPI document | `string` or `object` |
| options | Specify how the middleware should act. | `object` |

**Options Properties**

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| controllers | The directory to look at to find a controller with the same name as that specified in the `x-controller`. Defaults to the current working directory. | `string` |
| dereference | A function to call to dereference any JSON references. Must return a promise that resolves to the dereferenced object. Defaults to using [json-schema-ref-parser](https://www.npmjs.com/package/json-schema-ref-parser). | `function` |
| invalid | An error middleware function to call if the client request or server response is invalid according to your OpenAPI document. Set to `true` to have the OpenAPI-Enforcer middleware automatically send an appropriate response | `function` |
| mockProperty | The name of the property to look for on the headers or query string for manual mocking. Should begin with an `x-`. Set to blank to disable. | `string` |
| mockControllers | The path to the base mocks directory. This allows for creating mocks through function calls. Set to blank to disable. | `function` |
| reqProperty | The name of the property on the req object to store openapi data onto. Defaults to `"openapi"` | `string` |
| valid | A middleware function to run if the request was valid but no controller exists to handle the request. | `function` |
| xController | The name of the property within the OpenAPI definition that describes which controller to use. Defaults to `x-controller`. | `string` |
| xOperation | The name of the operation within the OpenAPI definition that describes the method name within the controller to use. First "operation" will be used, then this value. Defaults to `x-operation`. | `string` |

Returns a middleware function.

```js
const Enforcer = require('openapi-enforcer-middleware');
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
                responses: { ... }
            }
        },
    }
};

const enforcer = new Enforcer(schema);
const app = express();

app.use('/v1', enforcer({
    controllers: '/path/to/controllers',
    schema: schema,

    // this function runs if the request was not valid
    invalid: function(err, req, res, next) {
        res.status(err.statusCode);
        res.send(err.message);
    },

    // this function runs if the request was valid and no controller was found
    valid: function(req, res, next) {
        const id = req.params.id;   // request deserialized and validated
        const mock = req.openapi.mock();
        res.send(mock);
    })
});





app.use(
    '/v2',
    enforcer.middleware({ controllers: '/' }
    requestValid,
    enforcerError // Enforcer.error
);

// this middleware runs if the request was valid
function requestValid(req, res, next) {
    const id = req.params.id;   // request deserialized and validated
    const mock = req.openapi.mock();
    res.send(mock);
});

// put error catching middleware at the end
function enforcerError((err, req, res, next) {
    if (err.code === 'E_OAPI_ENFORCER') {
        res.status(err.statusCode);
        res.send(err.message);
    } else {
        next(err);
    }
});




app.use(
    '/v3',
    enforcer.start('./path/to/schema', { dereference: schema => { ... }, reqProperty: 'openapi', development: true }),
    enforcer.mock({ header: 'x-mock', query: 'x-mock', controllers: './mocks' }),
    enforcer.controllers({ controllers: './controllers', xController: 'x-controller', xOperation: 'x-operation', mockUnimplmented: true }),
    function (req, res, next) {
        if (!req.openapi) return next();
        // custom logic for valid requests
    }),
    enforcer.error({ handler: customCallback }),
    enforcer.stop()
);





const enforcer = Enforcer(schema, config);

enforcer.use((req, res, next) => {});

enforcer.use(enforcer.controllers({});

enforcer.use((err, req, res, next) => {});



const app = express();
app.use(enforcer);
```