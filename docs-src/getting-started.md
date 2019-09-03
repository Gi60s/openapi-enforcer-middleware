---
title: Getting Started
description: A quick start getting started guide for learning how to use the OpenAPI Enforcer middleware package.
---

This guide covers how you can turn your OpenAPI document into a working API.

# Installing Dependencies

You need to install this package and the peer dependency `openapi-enforcer` for this to work.

```bash
npm install openapi-enforcer openapi-enforcer-middleware
```

# Terminology

Please read this terminology list carefully so that the rest of this documentation makes sense.

- *controller* - A NodeJS file that exports functions that are known as *operations*.

- *operation* - A function exported from a controller file.

# Setup

Setting up your server to run an API using your OpenAPI document involves

1. Adding extensions to your OpenAPI document

2. Configuring your server's middleware

3. Writing controllers

The following diagram shows briefly the relationships between these three components and details follow in subsequent sections.

![Overview](overview.png)

## OpenAPI Document

Any property within your OpenAPI document that starts with a `x-` is known as an extension property. The OpenAPI Enforcer Middleware uses two extensions (`x-controller` and `x-operation`) to link your OpenAPI path operations to your NodeJS code.

For now know that:

- `x-controller` will map to file names inside of your controller or mock controller directories.

- `x-operation` will map to the function name within your controllers.

This example shows just one path in your OpenAPI document with these properties defined. Note that it is possible to define an `x-controller` at path and root levels and you can read more about that in the [controllers guide](./guide/controllers.md).

1. Save your OpenAPI document into your project directory.

2. Add `x-controller` and `x-operation` properties to each path operation.

```yml
openapi: '3.0.0'
info:
  title: People API
  version: "1.0.0"
paths:
  /people:
    get:
      x-controller: people
      x-operation: getList
      summary: Get a list of people
      responses:
        200:
          description: Get a list of people
```

## Server

This package works as an [Express](https://expressjs.com) middleware, but it also has an interface for your to add your own middleware.

The following example sets up the manual mock interface, controller interface, and fallback mock interface. Two directories `./controllers` and `./mock-controllers` are referenced as the place to run your code. For now leave this as is until we reach the [Setting up Controllers](#controllers) section.

1. Copy the example to your directory.

2. Update the `pathToOpenApiDoc` reference to point to your OpenAPI document's location.

3. Start the server.

4. At this point your server is ready to accept valid requests, but it will only provide automatically mocked responses. To customize the handling of requests and provide custom responses you'll need to [set up your controller files](#controllers).

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

const listener = app.listen(3000, err => {
  if (err) return console.error(err.stack)
  console.log('Server listening on port ' + listener.address().port)
})
```

## Controllers

Both controllers and mock controllers are mapped to using the `x-controller` and `x-operation` properties that you define in your OpenAPI document in conjunction with where you told the enforcer middleware to find your controller files.

In the examples above:
 
1. The [OpenAPI document](#openapi-document) defines `x-controller: people` and `x-operation: getList`.

2. The [Server](#server) specifies that `controllerDirectory = '/path/to/controllers'`

So within the controller directory we create our controller file `people.js` (pulled from the OpenAPI document's `x-controller` value). The `people.js` file exports a function on the `getList` property (pulled from the OpenAPI documents `x-operation` value). This function will be called whenever a request is made to `GET /people` (as defined in the OpenAPI document).

**File: `/path/to/controllers/people.js`**

```js
exports.getList = function (req, res, next) {
  res.send('OK')
}
``` 

