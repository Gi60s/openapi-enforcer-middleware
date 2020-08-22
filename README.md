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

## Documentation

https://byu-oit.github.io/openapi-enforcer-middleware/


## Examples

Convert your OpenAPI document into a working API:

```js
const express = require('express')
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('openapi-enforcer-middleware')

const app = express()

const enforcer = Enforcer('./openapi.yml')

// validate and deserialize requests
app.use(EnforcerMiddleware.init(enforcer))

// create routes to controllers
app.use(EnforcerMiddleware.buildRoutes('./path/to/routes'))

// respond to a request
app.get('/', (req, res) => {
  // validate and serialize the response before sending
  res.enforcer.send([
    { title: 'My First Task', due: new Date('2000-01-01T00:00:00.000Z') }
  ])
})

// send mock responses for endpoints that are not yet implemented
app.use(EnforcerMiddleware.mock())

app.listen(3000, (err) => {
  if (err) return console.error(err.stack)
  console.log('Listening on port 3000')
})
```