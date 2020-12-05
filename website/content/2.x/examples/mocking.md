---
title: Mocking Responses
description: Mocking example that shows an implemented mock, an example mock, and a schema mock.
---

**openapi.yml**

```yml
openapi: '3.0.0'
info:
  title: Users API
  version: '1.0'
paths:
  /users:
    get:
      x-mock-implemented: true
      x-controller: users
      x-operation: listUsers
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
      responses:
        201:
          description: Success
          headers:
            location:
              schema:
                type: string
          content:
            application/json:
              examples:
                
              schema:
                $ref: '#/components/schemas/User'
  /users/{userId}:
    parameters:
      - name: userId
        in: path
        required: true
        schema:
          type: integer
    get:
      x-operation: getUser
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
    put:
      x-operation: updateUser
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
    delete:
      x-operation: deleteUser
      responses:
        204:
          description: Success
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
          readOnly: true
        name:
          type: string
        email:
          type: string
      example:
        id: 1
        name: Bob
        email: bob@email.com



```


