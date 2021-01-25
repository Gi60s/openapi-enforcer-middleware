---
title: API Docs Generation
description: Automatically create API documentation based off of the provided API definition.
---

## Why generate documentation this way?

While the OpenAPI specification makes it easier for API consumers to understand how your API functions, reading the text of an API definition does not have good UX. Providing a link to documentation for your API makes the experience of understanding your API simpler for consumers. Additionally, as you change and update your API, the documentation will automatically remain up-to-date.

This project uses a tool called [ReDoc](https://github.com/Redocly/redoc) to provide human-readable documentation based off of the provided API definition. ReDoc provides modern, easy to understand documentation for an API without any extra work required by the developer. More information can be found in their GitHub repo.

## How to generate the documentation

```javascript
const app = express()

const enforcerMiddleware = EnforcerMiddleware(Enforcer('./openapi.yml'))
const specUrlPath = '/spec'
const serverPort = 3000

// Setup endpoint to return raw API definition
app.get(specUrlPath, (req: Request, res: Response) => {
  const specString = yaml.load(fs.readFileSync('./path/to/spec.yml', 'utf8'))
  res.status(200).send(specString)
})

// Setup endpoint for documentation
app.use('/docs', this.enforcerMiddleware.docs(specUrlPath, serverPort, redocOptions))
app.use('/api', enforcerMiddleware.init())

app.listen(serverPort)
```

First, there needs to be an endpoint serving the raw API specification. Then, once a route is created for the raw spec, the docs endpoint is make and the URL path to the raw definition, port for the server, and optionally a [ReDoc options object](https://github.com/Redocly/redoc#redoc-options-object).

## Note about routes

If using this middleware to generate documentation, it is recommended that the actually API not be served from `/`. Doing so will not break the documentation, but will cause an increased number of false positive errors and warning to be logged both by the process and in the browser.
