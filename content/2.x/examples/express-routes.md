---
title: Enforce Express Routes
description: Use the Enforcer Middleware to ensure that your Express routes are only invoked when the request is valid.
---

This example demonstrates the following:

- Express routes will only be invoked if the request was valid.
- Default values for input parameters are added to the request if omitted by the client.
- Responses can be validated, ensuring that you don't break your API contract.

**openapi.yml**

```yaml
openapi: '3.0.0'
info:
  title: My API
  version: 1x
paths:
  /:
    get:
      parameters:
        - in: query
          name: limit
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 100
      responses:
        200:
          description: A list of items
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
```

**index.js**

```js
const express = require('express')
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('openapi-enforcer-middleware')

async function run() {
  // Create the express app
  const app = express()

  // Specify the OpenAPI specification to enforce.
  const enforcer = await Enforcer('./openapi.yml')

  // Add the OpenAPI Enforcer Middleware to the Express app. 
  app.use(EnforcerMiddleware.init(enforcer))

  // Create an express route.
  // Because of the Enforcer middleware we know this route will only 
  // be executed if the request is valid.
  app.get('/', async (req, res) => {

    // We know the query's limit property will be a valid number
    // from 1 to 100. We also know that limit will always have a
    // value because we set a default value.
    const limit = req.enforcer.query.limit
    const results = await loadItems(limit)

    // Here we also validate that we're sending a valid response.
    // We don't want to break the contract that our OpenAPI document
    // has defined.
    res.enforcer.send(result)
  })

  // Start the server listening
  app.listen(3000, (err) => {
    if (err) return console.error(err.stack)
    console.log('Listening on port 3000')
  })
} 

run().catch(console.error)
```

**Mock with Sessions**

The store makes it easy to store data related to a specific client who is making requests, simplifying more realisitic mocks.

The default store uses cookies and local memory.

```js
// ...

app.get('/', async (req, res) => {
  // mock request
  if (req.enforcer.mockMode) {
    const data = await req.enforcer.mockStore.getData(req, res)
    const list = data.list || []
    res.send(list)
  } else {
    // code here for non-mock
  }
})

app.post('/', async (req, res) => {
  // mock request
  if (req.enforcer.mockMode) {
    const body = req.body
    await req.enforcer.mockStore.setData(req, res, body)
    res.sendStatus(201)
  } else {
    // code here for non-mock
  }
})
```
