const express = require('express')
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('../../dist')

const app = express()

const enforcer = Enforcer('./openapi.yml')

app.use(EnforcerMiddleware.init(enforcer))

app.get('/', (req, res) => {
  // const { id } = req.enforcer.params
  res.enforcer.send([
    { title: 'Hello', due: '2000-01-01T00:00:00.000Z' }
  ])
})

app.use(EnforcerMiddleware.mock())

app.listen(3002, (err) => {
  if (err) return console.error(err.stack)
  console.log('Listening on port 3000')
})


