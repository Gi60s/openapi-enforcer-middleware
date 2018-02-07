

## Enforcer.prototype.middleware

An express middleware function that will map the request path to a path in the Open API document before calling the next middleware.

`Enforcer.prototype.middleware ( options )`

| Parameter | Description | Type |
| --------- | ----------- | ---- |
| options | Router options. | `Object` |
| options.controllers | The directory to look at to find a controller with the same name as that specified in the `x-controller`. If not found then the function defined in `options.valid` will run. | `String` |
| options.development | Set to `false` to disable
| options.invalid | A function to call if the request was invalid. Receives four parameters: 1) the error, 2) the request object, 3) the response object, 4) the next function. Defaults to sending a 400 response with the error message. | `Function` |
| options.mock | The name of the query parameter to look for in a request to enable manual mocking. If not supplied then manual mocking is disabled | `String` |
| options.property | The request object's property name to use to store the Open API path details on. Defaults to `"openapi"` | `String` |
| options.valid | A middleware function to run if the request was valid. The path parameters, body, headers, and query string will all have passed validation and have been parsed into their correct format prior to calling this function. | `Function` |

Returns a middleware function.

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
    invalid: function(err, req, res, next) {
        res.status(400);
        res.send(err.message);
    },
    valid: function(req, res, next) {
        const id = req.params.id;   // => params parsed to match schemas
    })
});
```