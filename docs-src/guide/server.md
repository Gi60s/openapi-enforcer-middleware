---
title: Server Setup
subtitle: Guide
description: The OpenAPI Enforcer Middleware allows you to configure your server how you choose. This document provides some best practices.
---

The OpenAPI Enforcer Middleware allows you to configure your server how you choose. This document provides a best practice example that you can modify to meet your needs.

## Example

```js
const express = require('express')
const Enforcer = require('openapi-enforcer-middleware')
const path = require('path')

const app = express()
app.use(express.json())

const controllerDirectory = path.resolve(__dirname, 'controllers')
const mockDirectory = path.resolve(__dirname, 'mock-controllers') 
const pathToOpenApiDoc = path.resolve(__dirname, 'open-api-doc.yml')

// Create an enforcer middleware instance
const enforcer = Enforcer(pathToOpenApiDoc)
enforcer.promise.catch(console.error)

// Add mocking middleware to the enforcer middleware.
// This middleware will handle explicit mock requests.
enforcer.mocks(mockDirectory, false)
  .catch(console.error)

// Add controller middleware to the enforcer middleware .
// This middleware will handle requests for real data.
enforcer.controllers(controllerDirectory)
  .catch(console.error)

// Add fallback mocking middleware to the enforcer middleware.
// This middleware will automatically run mocking if the
// controller could not produce a response.
enforcer.mocks(mockDirectory, true)
  .catch(() => {}) // Any errors will have already been reported by explicit mock middleware

// Add the enforcer middleware runner to the express app.
app.use(enforcer.middleware())

// Add error handling middleware
app.use((err, req, res, next) => {
  // If the error was in the client's request then send back a detailed report
  if (err.statusCode >= 400 && err.statusCode < 500 && err.exception) {
    res.set('Content-Type', 'text/plain')
    res.status(err.statusCode)
    res.send(err.message)

  // If it's unsafe to send back detailed errors then send back limited error information
  } else {
    console.error(err.stack)
    res.sendStatus(err.statusCode || 500)
  }
})

// Start the server listening on port 3000.
const listener = app.listen(3000, err => {
  if (err) return console.error(err.stack)
  console.log('Server listening on port ' + listener.address().port)
})
```

## Example Breakdown

### Body Parsing

```js
const app = express()
app.use(express.json())
```

The OpenAPI Enforcer Middleware does not parse the body, so you will need to parse it yourself.

Recommended body parsers for common mime types:

- `application/json` can use the built in [Express](https://expressjs.com) JSON parser: `express.json()`

- `multipart/x-www-form-urlencoded` can use the built in [Express](https://expressjs.com) form parser: `express.urlencoded()`

- `multipart/form-data` is optimal for sending files can can use [openapi-enforcer-multer](https://www.npmjs.com/package/openapi-enforcer-multer)

### OpenAPI Document Parsing

```js
// Create an enforcer middleware instance
const enforcer = Enforcer(pathToOpenApiDoc)
enforcer.promise.catch(console.error)
```

Tell the OpenAPI Enforcer Middleware where to find your OpenAPI document. It will parse and validate it. Also, it is important to validate that no errors occurred during parsing, and that can be caught using the `enforcer.promse` property.

### Handling Explicit Mock Requests

```js
// Add mocking middleware to the enforcer middleware.
// This middleware will handle explicit mock requests.
enforcer.mocks(mockDirectory, false)
  .catch(console.error)
```

Mocking allows you to send back fake (yet structurally accurate) responses to the client. Explicit mocking is useful when you have a working API, but the user of your API would prefer to get a mocked response instead.

Explicit mocking should run prior to running your controllers.

It is important to check if your mock controllers ran into errors while loading, and that is why we add the `catch` call after calling the `mocks` function.

**Additional Reading:**

- [Details about mocking](mocking.md)

- [Details about controllers](controllers.md)

### Handling Real Requests

```js
// Add controller middleware to the enforcer middleware .
// This middleware will handle requests for real data.
enforcer.controllers(controllerDirectory)
  .catch(console.error)
```

Requests for actual data run through the [controllers](controllers.md).

### Handling Fallback Mock Requests

```js
// Add fallback mocking middleware to the enforcer middleware.
// This middleware will automatically run mocking if the
// controller could not produce a response.
enforcer.mocks(mockDirectory, true)
  .catch(() => {}) // Any errors will have already been reported by explicit mock middleware
```

It is useful to have fallback mocking if your API is not fully developed. This should be placed after your controllers middleware so that it only sends back mocked responses if the controller has not yet been implemented.

**Additional Reading:**

- [Details about mocking](mocking.md)

- [Details about controllers](controllers.md)
