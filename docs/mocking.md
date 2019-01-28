# Mocking

Producing mock responses is useful during the development of your API or during the development of clients that use your API. The mocking middleware can be added as [explict mock middleware](#explicit-mocking) and [fallback mock middleware](#fallback-mocking).

When mocking middleware runs it does the following:

1. If a mock [controller](./controllers.md) is defined then that will be run to produce the response. Mock controllers follow the same structure and guidelines as regular [controllers](./controllers.md).

2. If the response has an example, that example will be used to produce the response.

3. If the response has a schema then the schema will be used to generate a random value that adheres to the schema.

4. If the request indicated [explict mocking](#explicit-mocking) then the next middleware will be called with an error, otherwise the next middleware will be called without an error.

## Example

This is a common configuration for setting up your mock middleware with [explicit mocking](#explicit-mocking) middleware first and [fallback mocking](#fallback-mocking) middleware last.

```js
const EnforcerMiddleware = require('openapi-enforcer-middleware')
const express = require('express')

const app = express()
const enforcer = EnforcerMiddleware('/path/to/openapi-definition.yml')

enforcer.mocks('/path/to/mock-controllers-dir', false)  // check for explicit mock request
enforcer.controllers('/path/to/controllers-dir')        // normal request handling 
enforcer.mocks('/path/to/mock-controllers-dir', true)   // fallback mock handling last

app.use(enforcer.middleware());
app.use((err, req, res, next) => {
  res.sendStatus(500)
})

app.listen(3000)
```

## Explicit Mocking

Explicit mocking:

- Is defined as a request that specifically asks for the response to be mocked. 

- Will only work if you have included the [mocks middleware](#) on your server.

- Watches for a mock query parameter or mock header parameter as defined in the [enforcer middleware constructor options](#). If that mock parameter is included in the request then an explicit mock response will be produced.

The default mock query parameter or mock header parameter is set to `x-mock` but can be redefined in the [enforcer middleware constructor options](#). The value associated with that parameter can indicate the status code, source of mock data, and additional meta data used to producce the mock response. Here are some examples:

- `x-mock` - A value with an empty string, indicating that the default mock response should be returned.

- `x-mock=200` - Indicates that the 200 response code mock response should be returned. Any status code here is valid so long as it was defined in the Open API document as a valid response for that operation.

- `x-mock=200,controller` - Indicates that the 200 response code should be used and that the mock controller should produce it. This will only work if a mock controller is defined for this operation.

- `x-mock=200,example` - Indicates that the 200 response code example should be used to produce the response for this operation.

- `x-mock=200,example,cat` - Indicates that the 200 response code example named `cat` should be used to produce the response for this operation. This only works for Open API specification 3.

- `x-mock=200,random` - Indicates that the 200 response code schema should be used to generate a random value that adheres to the schema.


## Fallback Mocking

Fallback mocking will run automatically (without an explicit mock request) when it's middleware is called. Because of this, fallback mocking should be run after your normal [controllers middleware](#), otherwise the normal controlers may never run.