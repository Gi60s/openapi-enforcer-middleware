---
title: API
---

## OpenApiEnforcerMiddleware

The constructor will create an instance of the OpenAPI enforcer middleware.

**Signature** 

`OpenApiEnforcerMiddleware (definition: string [, options: object ])`

**Parameters**

- *definition* - A `string` indicating the path the the OpenAPI document definition or an `object` that is the Open API definition. If a `string` is specified then the document will be loaded and will resolve all `$ref` properties.

- *options* - An optional `object` with the following settings:

  - *componentOptions* - These options will passed directly on to the openapi-enforcer's components.

  - *fallthrough* - When this middleware is run, if `fallthough` is set to `true` then the next middleware will be called, otherwise a `404` response will be sent. Defaults to `true`.

  - *mockHeader* - The name of the header to look for to specify an [explicit mock](guide/mocking.md#explicit-mocking) request. Defaults to `"x-mock"`.

  - *mockQuery* - The name of the query parameter to look for to specify an [explicit mock](guide/mocking.md#explicit-mocking) request. This query parameter does not need to be defined in your OpenAPI document definition. Defaults to `"x-mock"`.

  - *reqMockStatusCodeProperty* - The name of the property to attach the [OpenAPI Enforcer's OpenAPI object](https://byu-oit.github.io/openapi-enforcer/api/components/operation) to on the request object. Defaults to `"openapi"`.

  - *reqOperationProperty* - The name of the property to attach the [OpenAPI Enforcer's Operation object](https://byu-oit.github.io/openapi-enforcer/api/components/operation) to on the request object. Defaults to `"operation"`.
  
  - *resSerialize* - A boolean indicating whether to serialize responses. If you disable this response serialization you may need to serialize your own responses, depending on what data you are sending back to the client. Defaults to `true`.
  
  - *resValidate* - A boolean indicating whether to validate responses. Responses that are invalid might not serialize. Defaults to `true`.

  - *xController* - The name of the property to look for in your OpenAPI document to define the name of the controller associated with an operation. Defaults to `"x-controller"`.

  - *xOperation* - The name of the property to look for in your OpenAPI document to define the name of the operation within the controller that is associated with the operation. Defaults to `"x-operation"`.

**Returns** an OpenAPI Enforcer Middleware instance

## Controllers

The OpenApiEnforcerMiddleware has its own internal middleware runner. Calling this function will define a [controllers group](./guide/controllers.md) that will handle requests and add it as an internal middleware.

**Signature**

`OpenAPIEnforcerMiddleware.prototype.controllers (controllers: string|object, ...dependencyInjection): Promise`

**Parameters**

- *controllers* - The path the the controllers directory or a controllers definition map. See the [controllers documentation](./guide/controllers.md) for more information.

- *dependencyInjection* - You can add any number of parameters after the first parameter and these will be passed in to a controller that uses [dependency injection](./guide/controllers.md#dependency-injection).

**Returns** a `Promise` that resolves if successfully loaded.

## Middleware

Call this function to return the middleware runner that will run the internal middlewares.

**Signature**

`OpenAPIEnforcerMiddleware.prototype.middleware (): Function`

**Parameters** None

**Returns** an [express](https://www.npmjs.com/package/express) middleware function.

## Mocks

The OpenApiEnforcerMiddleware has its own internal middleware runner. Calling this function will define a mock controllers group that will handle requests and add it as an internal middleware.

**Signature**

`OpenAPIEnforcerMiddleware.prototype.mocks (controllers: string|object, isFallback: boolean, ...dependencyInjection): Promise`

**Parameters**

- *controllers* - The path the the mock controllers directory or a controllers definition map. See the [controllers guide](./guide/controllers.md) for more information. This value can be set to `null` or `undefined` if you do not have any mock controller functions to run.

- *isFallback* - A boolean indicating whether this is [fallback middleware](guide/mocking.md#fallback-mocking) or if it requires [explicit mock](guide/mocking.md#explicit-mocking) requests to run.

- *dependencyInjection* - You can add any number of parameters after the first parameter and these will be passed in to a controller that uses [dependency injection](./guide/controllers.md#dependency-injection).

**Returns** A Promise that will resolve when the middleware loads correctly.

## Use

The OpenApiEnforcerMiddleware has its own internal middleware runner. Calling this function will add an internal middleware.

**Signature**

`OpenAPIEnforcerMiddleware.prototype.use (middleware: Function): undefined`

**Parameters**

- *middleware* - The express middleware function to add to the internal enforcer's middleware. Any responses sent from within these middlewares will be validated against the OpenAPI document definition prior to sending.

**Returns** nothing.
