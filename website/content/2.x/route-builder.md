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

module.exports = function () {
  return {
    getUser (req, res) {
      const user = dbConn.getUser(req.params.userId)
      if (user) {
        res.send(user)
      } else {
        res.sendStatus(404)
      }  
    }
  }
}
```

## How to Use the Route Builder

1. You need to include in your OpenAPI document the `x-controller` and `x-operation` (or `operationId`) properties where appropriate.
2. You need to write a controller file.
3. You need to call the route builder middleware.

You can see a working demo of a route builder on [Github](https://github.com/byu-oit/openapi-enforcer-middleware/tree/master/demo/v2).

### x-controller and x-operation

The `x-controller` property can be placed at the operation, path, or root of your OpenAPI document. The `x-controller` value specifies where the operation should look for the controller file. So, if you have an `x-controller: foo` then the route builder will look for `foo.js` in the controllers directory.

The `x-operation` property can only be placed within the operation definition. This value identifies the name of the function to call within the controller file.

In the following example there are multiple `x-controller` properties defined. It is not necessary to define the `x-controller` at all levels, just at the levels that make sense for your use case.

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

### Write a Controller File

A controller file needs to export a function. Having a function allows for you to pass in parameters to your controllers using dependency injection (which you'll see in the example below and in the [Call the Route Builder Middleware](#call-the-route-builder-middleware) section).

The function needs to export an object, and each property on that object is an accessible `x-operation` or `operationId` function.

**controllers/users.js**

```js
module.exports = function () {
  return {
    async listUsers (req, res) {
      const { rows } = dbConn.query('SELECT * FROM users')
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

### Call the Route Builder Middleware

To call the route builder middleware you need to specify the directory where your controllers reside. You also have the option to pass in additional parameters that will be injected into all controllers.

The route builder does require that you call the init middleware first.

```js
const express = require('express')
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('openapi-enforcer-middleware')
const path = require('path')
const dbConn = require('./db')

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

// Tell the route builder to look for the controller files in the "controllers" directory
// and inject the database connection dependency
const controllersPath = path.resolve(__dirname, 'controllers')
app.use(enforcer.route(controllersPath))

const listener = app.listen(8000, err => {
  if (err) return console.error(err.stack)
  console.log('Listening on port ' + listener.address().port)
})
```

## Dependency Injection

If you want to pass variables into your controllers then you can use dependency injection.

There are two ways to do this, using an `Array` to inject the same common dependencies into all controllers or using an `Object` map to inject specific dependencies into specific controllers.

If you have not already read up on [How to Use the Route Builder](#how-to-use-the-route-builder) then you should do that first, then return here.

### Common Dependencies

If all of your controllers should receive the same set of dependencies then this is the method you should use to inject those dependencies.

1. In your server file where you use the [route middleware](./api#route) you can add an array of dependencies as a second parameter.

    ```js
    const controllersPath = path.resolve(__dirname, 'controllers')
    app.use(enforcer.route(controllersPath, [ dbConn, serviceX ]))
    ```

2. In your controller files you receive the injected dependencies in the same order as they were provided.

    ```js
    module.exports = function (dbConn, serviceX) {
      return {
        async listUsers (req, res) {
          // ...
        }
      }
    }
    ```

### Controller Specific Dependencies

If you want finer control as to which dependencies get injected into which controllers then this is the option for you.

1. In your server file where you use the [route middleware](./api#route) you can inject dependencies as a map of arrays. The property names for the map are linked to the controller with the same name. It is also possible to list "common" dependencies in an array and those are added to the end of the injected dependencies for each controller. It is also possible to change the name of the common dependencies property using the [route middleware options](./api#route). 

    ```js
    const controllersPath = path.resolve(__dirname, 'controllers')
    const dependencies = {
      common: [ dbConn, serviceA ],
      tasks: [ serviceW ],
      users: [ serviceX, serviceY ]
    }
    app.use(enforcer.route(controllersPath, dependencies))
    ```
   
2. In your controller files you receive the controller specific dependencies followed by the common dependencies.
   
   **tasks.js**
   
    ```js
    module.exports = function (serviceW, dbConn, serviceA) {
     return {
       async getTask (req, res) {
         // ...
       }
     }
    }
    ```
   
   **users.js**
    
    ```js
    module.exports = function (serviceX, serviceY, dbConn, serviceA) {
     return {
       async listUsers (req, res) {
         // ...
       }
     }
    }
    ```
