---
title: Mocking
description: How to make mock requests and how to control what gets returned in a mock response.
---

Producing mock responses is useful during the development of your API or during the development of clients that use your API. The mocking middleware can be added as [explicit mock middleware](#explicit-mocking) and [fallback mock middleware](#fallback-mocking).

## Mock Response Sources

A mocked response can be generated from: 

1. Implemented Mock Response
2. Mock from Example
3. Mock from Schema using Random Generation

The implemented mock response takes precedence, then examples, and finally schema generated values. The mode that is used to create a mock response can also be selected when using [explicit mocking](#explicit-mocking).

### Implemented Mock Responses

If a path has an implemented mock response then it will be the mode used unless otherwise specified by an [explicit mock directive](#explicit-mocking). 

Implemented mocks allow you to use a [mock store](#mock-store) that more closely simulates a real API, allowing the client to store and retrieve data based on a temporary session.

Setting up an implemented mock is a two step process:

1. In your OpenAPI document specify `x-mock-implemented: true` for the implemented operations. (The property name can be changed in the [init middleware options](./init#init-options).
2. For implemented operations, write code that checks for the `mockMode` or `mockStore` properties on the express request object. Those properties indicate a request for a mocked response.

**openapi.yml**

In the following example we can see all the places where an `x-mock-implemented` property can be set. This is for demonstration purposes only. It's overkill to put it in all of these locations.

Placing the `x-mock-implemented` at the root level or paths level will indicate that all paths and all operations have mocks implemented. Placing them within the path (but not the operaton) will indicate that all operations under that path have implemented mocks. Of course, placing it in just the operation indicates that that operation has an implemented mock.

```yml
openapi: 3.0.2
info:
  title: Foo
  version: alpha-1.0
x-mock-implemented: true
paths:
  x-mock-implemented: true
  /:
    x-mock-implemented: true
    get:
      x-mock-implemented: true
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                type: string  
``` 

**app.js**

```js
const express = require('express')
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('openapi-enforcer-middleware')

const enforcerMiddleware = EnforcerMiddleware(Enforcer('./openapi.yml'))
app.use(enforcerMiddleware.init())

app.get('/api/users', (req, res) => {
  if (req.enforcer.mockStore) {
    // if the request is for a mocked implemented request then we'll get here
    // ... do some processing
    res.enforcer.send([])  

  } else {
    // ... run non-mocked processing here
    res.enforcer.send([])
  }
})

app.listen(3000)
```

### Mock from Example

Mock responses can be generated from OpenAPI schema examples. All that is required is to add an example following the appropriate OpenAPI specification.

### Mock from Schema

Producing a random value from a schema is generally possible. Your OpenAPI document must have a schema defined for the response for this to work. That's it.

## Explicit Mocking

An explicit mock request is a request to your API where the client is specifically asking for a mocked response. Through this method it is also possible to specify what response status code you want as well as what source to use for mocking. This type of mocking will be enabled if you have not specified a blank string for the [init middleware options](./api#init-options) `mockHeader` and `mockQuery`.

Here are some examples of either a header or query string parameter can be set to for a client to specify what they want a mock response for:
     
 - `x-mock` - A value with an empty string, indicating that the default mock response should be returned.
 - `x-mock=200` - Indicates that the 200 response code mock response should be returned. Any status code here is valid so long as it was defined in the OpenAPI document as a valid response for that operation.
 - `x-mock=200,controller` - Indicates that the 200 response code should be used and that the mock controller should produce it. This will only work if a mock controller is defined for this operation.
 - `x-mock=200,example` - Indicates that the 200 response code example should be used to produce the response for this operation.
 - `x-mock=200,example,cat` - Indicates that the 200 response code example named `cat` should be used to produce the response for this operation. This only works for OpenAPI specification 3.
 - `x-mock=200,random` - Indicates that the 200 response code schema should be used to generate a random value that adheres to the schema.

## Fallback Mocking

Fallback mocking is useful for when your API is under development and you'd like to let clients use the API before it is complete.

This type of mocking requires that you use the [mock middleware](./api#mock). Read the [mock middleware API documentation](./api#mock) for examples on how to use this.

## Mock Store

The mock store is a tool that allows you to create [implemented mock responses](#implemented-mock-responses) that maintain stateful information that is attached to a specific client.

###### Mock Store Usage Example

This example demonstrates how to access a mock store for an implemented mock response.

```js
const express = require('express')
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('openapi-enforcer-middleware')

const enforcerMiddleware = EnforcerMiddleware(Enforcer('./openapi.yml'))
app.use(enforcerMiddleware.init())

app.get('/api/users', async (req, res) => {
  const { mockStore } = req.enforcer

  // this request is a request for a mocked response
  if (mockStore) {
    const users = (await mockStore.get('users')) || []
    res.enforcer.send(users)  

  } else {
    // ... run non-mocked processing here
    res.enforcer.send([])
  }
})

app.post('/api/users', async (req, res) => {
  const { body, mockStore } = req.enforcer

  // this request is a request for a mocked response
  if (mockStore) {
    const users = (await mockStore.get('users')) || []
    users.push(body)
    await mockStore.set('users', users)
    res.enforcer.send(users)  

  } else {
    // ... run non-mocked processing here
    res.enforcer.send([])
  }
})

app.listen(3000)
```

### Default Mock Store

By default this package comes with a built-in cookie mock store that stores an identifier in a client cookie. The cookie must be sent with each request to maintain mock store state. This default mock store is very basic and has the following pros and cons.

**Pros**

- Can store a lot of data in memory on the server.
- Stores only an identifier into the `enforcer-store` cookie for the client.

**Cons**

- The client has to pass the `enforcer-store` cookie with each request.
- The API server must have a single instance. No load balancing or cloud functions allowed.

### Custom Mock Stores

#### Writing the Code for the Custom Mock Store

<el-alert type="warning" title="If you create your own custom mock store and publish it to NPM be sure to add the keywords 'openapi-enforcer openapi-enforcer-mock-store' so that other users can find it."></el-alert>

<a href="https://www.npmjs.com/search?q=openapi-enforcer-mock-store" target="_blank">Search NPM for Existing Mock Stores</a>

It is fairly easy to create your own mock store to store data as you see fit.

1. You need to export two functions: `get` and `set`.
2. The `get` function will receive three parameters: `req` - the request object, `res` - the response object, and `key` - a string used to identify the value that should be retrieved. This function should use the `req` and `res` objects to uniquely identify the client.
3. The `set` function will receive four parameters: `req` - the request object, `res` - the response object, `key` - a string used to identify the value that should be set, and `value` - the value that should be stored. This function should use the `req` and `res` objects to uniquely identify the client.

How you actually store the values within the custom mock store is up to you. For example, it could be a redis store, a database, or other storage medium.

**Example**

This is a non-working example that should help you understand the basics of creating a custom mock store. It has been wrapped with a function to enable a configuration to be passed in.

```js
const store = {}

export default function (config) {
    return {
        async get (req, res, key: string) {
            const id = getCookie(req.headers)
            if (id) {
                const data = store[id]
                return data[key]
            } else {
                const id = createNewId()
                store[id] = {}
                return undefined
            }
        },

        async set (req, res, key, value): Promise<void> {
            let id = getCookie(req.headers)
            if (!id) id = createNewId()
            store[id] = {}
            store[id][key] = value
        }
    }
}
```

#### Implementing the Custom Mock Store

Once you have created a custom mock store or installed another custom mock store you need to tell the [init middleware](./api#init-options) what function to call to implement your mock store.

**Example**

```js
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('openapi-enforcer-middleware')
const MyCustomMockStore = require('./my-custom-mock-store')
const express = require('express')

const app = express()

const enforcerMiddleware = EnforcerMiddleware(Enforcer('./openapi.yml'))
const initOptions = {
  mockStore: MyCustomMockStore()
}
app.use(enforcerMiddleware.init(initOptions))

// add routes here...

app.listen(3000)
```
