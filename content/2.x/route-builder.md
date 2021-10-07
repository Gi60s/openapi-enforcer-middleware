---
title: Route Builder
description: Automatically build your express routes by linking your OpenAPI document to controller code.
---

## Why Use the Route Builder

The route builder is a tool for linking the `x-controller` and `x-operation` (or `operationId`) within your OpenAPI document to executable code.

**The advantage of this method** is that you don't need to keep your express methods and routes in-sync with your OpenAPI document. The route builder will automatically adjust express methods and routes to match your OpenAPI document.

Traditionally with express you'd write your own routes, like this:

**server.js**

```js
const app = express()
const dbConn = getDbConnection()

// get a specific user
app.get('/api/users/:userId', (req, res) => {
  const user = dbConn.getUser(req.params.userId)
  if (user) {
    res.send(user)
  } else {
    res.sendStatus(404)
  }
})
```

The route builder allows you to build a controller file like this:

**controllers/users.js**

```js
const app = express()
const dbConn = getDbConnection()

app.use(enforcer.route({
  users: {
    getUser: function (req, res) {
      const user = dbConn.getUser(req.params.userId)
      if (user) {
        res.send(user)
      } else {
        res.sendStatus(404)
      }
    }
  }
}))
```

## How to Use the Route Builder

1. You need to include in your OpenAPI document the `x-controller` and `x-operation` (or `operationId`) properties where appropriate.
2. You need to call the route builder middleware.

You can see a working demo of a route builder on [Github](https://github.com/byu-oit/openapi-enforcer-middleware/tree/master/demo/v2).

### x-controller and x-operation

The `x-controller` property can be placed at the operation, path, or root of your OpenAPI document. This value is essentially a namespace or category for a set of operations.

The `x-operation` property can only be placed within the operation definition. This value identifies the name of the function to call within a controller.

In the following example (for demonstration purposes only) there are multiple `x-controller` properties defined. It is not necessary to define the `x-controller` at all levels, just at the levels that make sense for your use case.

```yml
openapi: '3.0.0'
info:
  title: My API
  version: '1.x'
x-controller: users         // applies to all paths and operations
paths:
  /users:
    x-controller: users     // applies to all operations at this path
    get:
      x-controller: users   // applies just to this operation
      x-operation: listUsers
```

### Call the Route Builder Middleware

To call the route builder middleware you need to specify the directory where your controllers reside. You also have the option to pass in additional parameters that will be injected into all controllers.

The route builder does require that you call the init middleware first.

```js
const express = require('express')
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('openapi-enforcer-middleware')
const path = require('path')
const dbClient = require('./db')

const openapiPath = path.resolve(__dirname, 'openapi.yml')
const enforcer = EnforcerMiddleware(Enforcer(openapiPath))

// Add this error handler to pick up on route builder errors
enforcer.on('error', err => {
  console.error(err.stack)
})

const app = express()
app.use(express.json())

// Set the base path "/api" as a prefix for all OpenAPI paths.
app.use('/api', enforcer.init())

// Tell the route builder to handle routing requests.
app.use(enforcer.route({
  // The "users" is mapped to via the "x-controller" value.
  users: {
    // The "listUsers" is mapped to via the "x-operation" or "operationId" value.
    async listUsers (req, res) {
      const { rows } = dbClient.query('SELECT * FROM users')
      const users = rows.map(row => {
        return {
          id: row.id,
          name: row.name,
          email: row.email
        }
      })
      res.enforcer.send(users)
    }
  }
}))

const listener = app.listen(8000, err => {
  if (err) return console.error(err.stack)
  console.log('Listening on port ' + listener.address().port)
})
```

## Handling Many Routes

This section builds on [How to Use the Route Builder](#how-to-use-the-route-builder). Read that first if you have not yet read it.

For APIs that want to separate route logic from your main server file, the pattern is simple and follows well established standards. The following code examples show some recommended practices.

1. Create a separate controller file for each unique `x-controller` value.
2. Require the controllers you want into your main server file and add it to the enforcer router.

**controllers/users.js**

This is an example controller file. We export a function that will return an operations map. By exporting a function we can now pass in dependencies, such as a reusable database client.

```js
module.exports = function (dbClient) {
  return {
    // The "listUsers" is mapped to via the "x-operation" or "operationId" value.
    async listUsers (req, res) {
      const { rows } = dbClient.query('SELECT * FROM users')
      const users = rows.map(row => {
        return {
          id: row.id,
          name: row.name,
          email: row.email
        }
      })
      res.enforcer.send(users)
    }
  }
}
```

**Server File**

```js
const express = require('express')
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('openapi-enforcer-middleware')
const path = require('path')
const dbClient = require('./db')
const users = require('./controllers/users.js') // users controller

const openapiPath = path.resolve(__dirname, 'openapi.yml')
const enforcer = EnforcerMiddleware(Enforcer(openapiPath))

// Add this error handler to pick up on route builder errors
enforcer.on('error', err => {
  console.error(err.stack)
})

const app = express()
app.use(express.json())

// Set the base path "/api" as a prefix for all OpenAPI paths.
app.use('/api', enforcer.init())

// Tell the route builder to handle routing requests.
app.use(enforcer.route({
  users: users(dbClient)
}))

const listener = app.listen(8000, err => {
  if (err) return console.error(err.stack)
  console.log('Listening on port ' + listener.address().port)
})
```
