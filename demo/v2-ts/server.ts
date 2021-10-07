import express from 'express'
// @ts-ignore
import Enforcer from 'openapi-enforcer'
import EnforcerMiddleware from '../../src'
import path from 'path'
import users from './controllers/users'

async function server () {
  const openapiPath = path.resolve(__dirname, 'openapi.yml')
  const enforcer = EnforcerMiddleware(await Enforcer(openapiPath))

  enforcer.on('error', (err: Error) => {
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

// @ts-ignore
  const listener = app.listen(8000, (err: Error) => {
    if (err) return console.error(err.stack)
    // @ts-ignore
    console.log('Listening on port ' + listener.address().port)
  })

}

server().catch(console.error)
