const express = require('express')
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('../../dist')
const path = require('path')

const openapiPath = path.resolve(__dirname, 'openapi.yml')
const enforcer = EnforcerMiddleware(Enforcer(openapiPath))

enforcer.on('error', err => {
  console.error(err)
})

const app = express()
app.use(express.json())

app.use('/api', enforcer.init())

// const controllersPath = path.resolve(__dirname, 'controllers')
// app.use(enforcer.route(controllersPath))

app.use(enforcer.route({
  users: require('./controllers/users')
}))

app.use('/docs', enforcer.docs({
  postRedocInitScripts: ['/foo.js', './bar.js']
}))

const listener = app.listen(8000, err => {
  if (err) return console.error(err.stack)
  console.log('Listening on port ' + listener.address().port)
})