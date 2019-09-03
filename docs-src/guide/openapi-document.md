---
title: OpenAPI Document
subtitle: Guide
description: This guide covers how to use OpenAPI extensions to link your OpenAPI document to your code.
---

Take the following OpenAPI document:

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

- `x-controller` defines the name of the [controller object](controllers.md) and it can be defined at:

  1. The [Operation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#operationObject) level, taking highest priority.

  2. The [PathItem Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#pathItemObject) (labeled `/employee/{employee_id}`) taking secondary priority.

  3. The root [OpenAPI Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#oasObject) taking final priority.

- `x-operation` defines the name of the function within that [controller](controllers.md) that should be called.
