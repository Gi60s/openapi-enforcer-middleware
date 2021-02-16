---
title: Getting Started
description: A brief example on how to get going quickly with this middleware.
tags: serialize deserialize
---

## Install Package

You will want both the [OpenAPI Enforcer](https://www.npmjs.com/package/openapi-enforcer) and this middleware installed.

```bash
npm install openapi-enforcer openapi-enforcer-middleware
```

## Serializing vs Deserializing

<el-alert title="Read this section if you're unfamiliar with serialization." type="error"></el-alert>

You'll see these two words (serialize and deserialize) a lot in the documentation so it's important to understand what they mean.

- **serialize** - Converting a value into a string equivalent
- **deserialize** - Converting a string into a native value equivalent.

As a developer you know the value difference between `a` and `b` in this example:

```js
const a = 1
const b = '1'
```

You can see that `a` is a number and `b` is a string.

If you send either `1` or `'1'` over the internet it has to be *serialized* before sending. Once serialized the value will look like this: `1`. How can you know whether `1` then represents a number or a string? The value will need to be *deserialized* back into it's type based value before you can know.

This library will automatically handle serialization and deserialization for you when you use the [request and response enforcer objects](./req-res-enforcer).

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

// Catch errors
enforcerMiddleware.on('error', err => {
  console.error(err)
  process.exit(1)
}) 

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

## Auto Build Routes

If you are interested in having this package build your express routes for you so that you don't have to keep your express routes in sync with your OpenAPI paths then check out the [route builder documentation](route-builder.md)..
