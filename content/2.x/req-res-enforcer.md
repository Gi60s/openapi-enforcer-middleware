---
title: Req / Res Enforcer
description: Understand what properties and functions exist on the enforcer property for both of the express request and response objects.
---

This middleware augments the express request and response objects with an `enforcer` property when the [init middleware](./api#init) runs. The only exception to this is if the request is invalid then the `enforcer` property will not be present on the request and response objects.

**Example**

```js
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('openapi-enforcer-middleware')
const express = require('express')

const app = express()

const enforcerMiddleware = EnforcerMiddleware(Enforcer('./openapi.yml'))

// initialize enforcer middleware
app.use(enforcerMiddleware.init())

// add a route
app.get('/', (req, res) => {
  // get the limit query parameter that has been validated and deserialized
  const limit = req.enforcer.query.limit

  // ... do some processing

  // send back a validated and serialized response
  res.enforcer.send([])
})

app.listen(3000)
```

## Request Enforcer Object

For a valid request the `enforcer` property will be added to the express request object. The `enforcer` object has the following properties:

### accepts

`accepts (responseCode: number | string)`

A function that will determine the acceptable content types that the client (browser) will accept that your OpenAPI document says can be produced. The results come back in priority order, so the first item in the results array is probably the content type that you want to build for.

This function is a small wrapper that calls the [OpenAPI Enforcer getResponseContentTypeMatches function](https://byu-oit.github.io/openapi-enforcer/api/components/operation#getresponsecontenttypematches) by passing through the `responseCode` parameter and adding the `accepts` parameter by reading the request's `accept` header.

**Parameters**

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| responseCode | `number` or `string` | The status code or response code that you'll be sending back to the client. | 

**Returns** An [Enforcer Result](https://byu-oit.github.io/openapi-enforcer/api/enforcer-result) whose value is an array of strings. Each string is a content type that both the client and server agree on. The order of the items in the array is the order that the client prefers.

Check out the [OpenAPI Enforcer getResponseContentTypeMatches documentation](https://byu-oit.github.io/openapi-enforcer/api/components/operation#getresponsecontenttypematches) to more fully understand this result. (This function is a wrapper for that function.)

**Example**

```js
app.get('/', (req, res) => {
  const [ contentTypes, error ] = req.enforcer.accepts(200)
  const contentType = contentTypes[0]
  res.set('content-type', contentType)
  switch (contentType) {
    case 'text/plain':
      res.enforcer.send('some value')
      break
    case 'application/json':
      res.enforcer.send({ value: 'some value'})
      break
  }
})
```

### cookies

An object that contains the request cookies. Any cookies defined in your OpenAPI document will have been deserialized and validated. Cookies not defined in your OpenAPI document will still be here as `string` values.

### headers

An object that contains the request headers. Any headers defined in your OpenAPI document will have been deserialized and validated. Headers not defined in your OpenAPI document will still be here as `string` values.

### mockMode

This property will only exist if the request calls for a mocked response. This specifies the mode to use for building the mock response. Read the [mocking](./mocking) documentation for more details.

### mockStore

This [mock store](./mocking#mock-store) property will only exist if the request calls for a mocked response and is to be used with an [implemented mock](./mocking#implemented-mock-responses). It allows you to create more realistic mock scenarios be establishing a session with the client that allows to client to make updates and to query those updates.

### openapi

The [OpenAPI Enforcer](https://byu-oit.github.io/openapi-enforcer/api/components/openapi) object that was built from your OpenAPI document.

### operation

The [OpenAPI Enforcer Operation](https://byu-oit.github.io/openapi-enforcer/api/components/operation) object that is associated with the current request.

### options

The options used when the [init middleware](./api#init) was called.

### params

The request path parameters, deserialized and validated.

### response

An alias to the [OpenAPI Enforcer response](https://byu-oit.github.io/openapi-enforcer/api/components/operation#response) function.

### query

An object that contains the request query parameters. Any query parameters defined in your OpenAPI document will have been deserialized and validated. If you have [allowed other query parameters](./api#init-options) then those will also be included in this object however express choose to deserialize them.

## Response Enforcer Object

For a valid request the `enforcer` property will be added to the express response object. The `enforcer` object has the following properties:

### send

`send (value: any)`

Validate, serialize, and send the response value.

**Parameters**

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| value | any | The response body to send back to the client. This value will be validated and serialized prior to sending. | 

**Returns** nothing.

**Example**

```js
app.get('/', (req, res) => {
  res.enforcer.send('some value')
})
```
