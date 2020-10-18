---
title: Getting Started
description: A brief example on how to get going quickly with this middleware.
---

## Install Package

You will want both the [OpenAPI Enforcer](https://www.npmjs.com/package/openapi-enforcer) and this middleware installed.

```bash
npm install openapi-enforcer openapi-enforcer-middleware
```

## Server Setup

The below example is for a basic server set up using default options.

Be sure to read up on the [req and res enforcer properties](./req-res-enforcer) to get the biggest benefit from this middleware.

```js
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('openapi-enforcer-middleware')
const express = require('express')

const app = express()

// Any paths defined in your openapi.yml will validate and parse the request
// before it calls your route code.
const enforcerMiddleware = EnforcerMiddleware(Enforcer('./openapi.yml'))
app.use(enforcerMiddleware.init())

// If your openapi.yml file defines this path then this path will only
// execute when the request is valid otherwise it will send back a 400
// with a message describing why the request was invalid.
app.get('/api/users/:userId', (req, res) => {
  // OLD WAY: get the userId as a string
  const userIdOldWay = req.params.userId  

  // BETTER WAY: get the userID as the type defined in your openapi.yml file
  const userId = req.enforcer.params.userId

  // ... do some processing

  // validate, serialize, and send a response that follows your openapi.yml file
  res.enforcer.send({
    userId,

    // The date object will serialize to the correct format, according to your
    // openapi.yml file.  Most likely this will be either the openapi format
    // `date` or `date-time`.
    birthDate: new Date('2000-01-01') 
  })
  
})

app.listen(3000)
```
