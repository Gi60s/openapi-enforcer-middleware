const express = require('express')
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('../../dist')
const path = require('path')
const users = require('./controllers/users')

async function server () {
  const openapiPath = path.resolve(__dirname, 'openapi.yml')
  const enforcer = EnforcerMiddleware(await Enforcer(openapiPath))

  enforcer.on('error', err => {
    console.error(err)
  })

  const app = express()
  app.use(express.json())

  app.use('/api', enforcer.init())

  app.use('/api', enforcer.route({
    users: users()
  }))

  app.use('/docs', enforcer.docs({
    postRedocInitScripts: ['/foo.js', './bar.js']
  }))

  const listener = app.listen(8000, err => {
    if (err) return console.error(err.stack)
    console.log('Listening on port ' + listener.address().port)
  })
}

server().catch(console.error)
