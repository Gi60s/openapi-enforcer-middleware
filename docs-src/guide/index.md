---
title: Guide
description: Learn how the OpenAPI specification documentation and the OpenAPI Enforcer Middleware work together to make creating honest API's easy.
navOrder: server openapi-document controllers advanced
---

This guide walks you through convert your OpenAPI document into a working API that implements request and response validation, serialization, and deserialization.

# High Level Overview

## Server Setup 

**File path:** `/opt/webroot/server.js`

This file starts the server. This example skips over some [best practices](server.md) for simplicity sake.

```js
const express = require('express')
const Enforcer = require('openapi-enforcer-middleware')

const app = express()

// path to the OpenAPI document file
const enforcer = Enforcer('/opt/webroot/openapi.yml')

// path to directory holding controller files
enforcer.controllers('/opt/webroot/controllers')

app.use(enforcer.middleware())

app.listen(3000)
```

## OpenAPI Document

**File path:** `/opt/webroot/openapi.yml`

Notice that extension properties `x-controller` and `x-operation` that together tell the server that an API request to `GET /people` should execute the `getList` function in the `people.js` file. The server finds the `people.js` file at `/opt/webroot/controllers` as defined in the `server.js` file.

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

## Controller Setup

**File path:** `/opt/webroot/controllers/people.js`

This is the `people` controller. It exports the `getList` operation that will receive the request object, response object, and next function that originate from the [Express package](https://expressjs.com).

```js
exports.getList = function (req, res, next) {
  const list = getListOfPeople()
  res.send(list)
}
```

# Keep Learning

The above is a very high level overview, now you can learn in depth about each of these components:

- [Server Setup](server.md)

- [OpenAPI Document](openapi-document.md)

- [Controllers](controllers.md)
