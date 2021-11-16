# Open API Enforcer Middleware

An express middleware that makes it easy to write web services that follow an Open API specification by leveraging the tools provided in the [openapi-enforcer](https://www.npmjs.com/package/openapi-enforcer) package.

## Features

- Supports OpenAPI (Swagger) 2.0 and 3.x
- Express middleware
- Automatically link JavaScript functions to path endpoints
- Parses and validates incoming requests
- Validates responses prior to sending
- Automatic response mocking in development
- Option for manual response mocking in production
- Highly configurable
- Accepts middleware plugins

## Installation

This package has [openapi-enforcer](https://www.npmjs.com/package/openapi-enforcer) as a peer dependency, so both must be installed.

```bash
npm install openapi-enforcer openapi-enforcer-middleware
```

## Documentation

https://byu-oit.github.io/openapi-enforcer-middleware/
