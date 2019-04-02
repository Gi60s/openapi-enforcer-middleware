# Open API Enforcer Middleware Demo

This is a working demo.

## Option 1: Run with Docker

If you run the demo using Docker then the API will use an actual database.

1. Run the command `docker-compose up`.

2. To get a list of all current tasks, perform an HTTP GET request against `http://localhost:3000`.

3. Following the swagger definition (either `openapi-v2.yml` or `openapi-v3.yml`) to know how to make other requests against the API on `http://localhost:3000`.

## Option 2: Run without Docker

If you run the demo without Docker then the mock controllers will be used to handle requests.

1. Navigate into the directory `server` and run the command: `npm start`

2. To get a list of all current tasks, perform an HTTP GET request against `http://localhost:3000`.

3. Following the swagger definition (either `openapi-v2.yml` or `openapi-v3.yml`) to know how to make other requests against the API on `http://localhost:3000`.
