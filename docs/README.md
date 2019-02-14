# Open API Enforcer Middleware

This library uses the functionality of the [Open API Enforcer](https://www.npmjs.com/package/openapi-enforcer) and adds some basic routing and middlware functionality.

This middlware has its own internal middleware that will enforce valid responses (as defined by the Open API document definition).

See the [Example](#example) below or [check out the demo](../demo) and then read up on how [controllers](./controllers.md) and [mocking](./mocking.md) work.

## Example

**server.js**

```js
const EnforcerMiddleware = require('openapi-enforcer-middleware')
const express = require('express')

const app = express()

// create an enforcer instance
const enforcer = EnforcerMiddleware('/path/to/openapi-definition.yml')
enforcer.promise.catch(errorHandler)

// check for explicit mock request
enforcer.mocks('/path/to/mock-controllers-dir', false)
  .catch(errorHandler)

// call defined operation handlers
enforcer.controllers('/path/to/controllers-dir')
  .catch(errorHandler)

// produce fallback mock responses
enforcer.mocks('/path/to/mock-controllers-dir', true)
  .catch(errorHandler)

// tell express to run the internal open api enforcer middleware
app.use(enforcer.middleware())

// add error handling middleware
app.use((err, req, res, next) => {
  res.sendStatus(500)
})

// start the server listening
app.listen(3000)

function errorHandler (err) {
  console.error(err.stack)
  if (app.get('env') !== 'development') process.exit(1)
}
```