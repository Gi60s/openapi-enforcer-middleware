---
title: OpenAPI Enforcer Middleware
description: Home page
noRightColumn: true
---

An express middleware that makes it easy to write web services that follow an Open API specification by leveraging the tools provided in the [openapi-enforcer](https://www.npmjs.com/package/openapi-enforcer) package.

## Documentation Version

Which version of the documentation do you want to see?

<el-button onclick="window.location.href = '/1.x'">Docs for 1.x</el-button>
<el-button onclick="window.location.href = '/2.x'" type="success">Docs for 2.x</el-button>

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
