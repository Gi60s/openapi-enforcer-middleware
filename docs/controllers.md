# Controllers

For the [openapi-enforcer-middleware](https://www.npmjs.com/package/openapi-enforcer-middleware) a controller is an object that contains the operations (functions) to call when a specific path is requested.

Connecting your Open API document to your controllers and operations is as easy as:

1. [Defining your Open API document](#the-open-api-document), including your `x-controller` and `x-operation` properties.

2. [Defining your controllers](#defining-controllers) either as controller files or controller objects.

3. [Configuring your middleware](#configure-middleware) to use the controllers.

## The Open API Document

Take the following Open API document:

```yml
openapi: '3.0.0'
info:
  title: Employee's API
  version: "1.0.0"
paths:
  /employee/{employee_id}:
    get:
      x-controller: myController
      x-operation: myOperation
      parameters:
        - name: employee_id
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: An employee object
```

Notice that within the [Operation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#operationObject) (the part labeled `get`) that we have two extensions.

- `x-controller` defines the name of the object to find the operation in and it can be defined at:

  1. The [Operation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#operationObject) level, taking highest priority.

  2. The [PathItem Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#pathItemObject) (labeled `/employee/{employee_id}`) taking secondary priority.

  3. The root [OpenAPI Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oasObject) taking final priority.

- `x-operation` defines the name of the function within that controller that should be called.

## Defining Controllers

A controller can either by an object or a function that returns an object.

- A controller as an object:

  ```js
  const controller = {
    myOperation: function (req, res, next) {
      // ...
    }
  }
  ```

- A controller as a funtion must return an object that looks like a controller object. The advantage of this method is that it allows for [dependency injection](#).

  ```js
  function makeController () {
    const controller = {}

    controller.myOperation = function (req, res, next) {
      // ...
    }

    return controller
  }
  ```

## Configure Middleware

Configuring the middleware is as easy as telling it where the controllers are.

Take the following example of setting up your server:

```js
const EnforcerMiddleware = require('openapi-enforcer-middleware')
const express = require('express')

const app = express()
const enforcer = EnforcerMiddleware('/path/to/openapi-definition.yml')

// PUT CONTROLLER MIDDLEWARE HERE
// enforcer.controllers(...)

app.use(enforcer.middleware())

app.listen(3000)
```

We can define where the controllers are one of two ways:

1. Define the controller inline. This method lets you define multiple controllers with multiple operations all inline.

    ```js
    enforcer.controllers({
      myController: {
        myOperation: function (req, res, next) {
          
        }
      }
    })
    ```

2. Define the controller in another file allows you to specify a directory where your controller files are. The `x-controller` value looks for a file with that name withing the specified directory and loads it.

    ```js
    enforer.controllers('/path/to/controllers-dir')
    ```

    ```js
    // File location:
    // /path/to/my/ontrollers-dir/myController.js
    
    exports.myOperation = function (req, res, next) {

    }
    ```

## Controller Dependency Injection

If you are using controller files (see [Configuring Middleware](#configure-middlware)) then you may want to inject some data or functionality into the controller.

```js
const EnforcerMiddleware = require('openapi-enforcer-middleware')
const express = require('express')

const app = express()
const enforcer = EnforcerMiddleware('/path/to/openapi-definition.yml')
const databaseConnection = ...
const someData = { ... }

enforcer.controllers('/path/to/controllers-dir', databaseConnection, someData)

app.use(enforcer.middleware())

app.listen(3000)
```

```js
// File location:
// /path/to/my/ontrollers-dir/myController.js

module.exports = function (databaseConnection, someData) {
  const controller = {}

  controller.myOperation = async function (req, res, next) {
    const rows = await databaseConnection.query('SELECT * FROM foo')
    res.send(rows)
  }

  return controller
}
```