
# v2 Demo

This demo uses the `openapi-enforcer-middleware` version `2.x.x`.

The demo shows a working API for implemented mock requests, so be sure to add the header: `x-mock: ` (value is an empty string) to your requests, keep the `enforcer-store` cookie, and send that cookie with each request.

Refer to the `openapi.yml` file in this directory to know how to hit the endpoints. Due to the `server.js` file, there is a base path of `/api` prefixing all paths.

Start the server with the command `node server.js`. Once started, try hitting the endpoint `GET http://localhost:8000/api/users`.