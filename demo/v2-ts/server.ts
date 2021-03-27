import express from 'express'
// @ts-ignore
import Enforcer from 'openapi-enforcer'
import EnforcerMiddleware from '../../dist'
import path from 'path'

const openapiPath = path.resolve(__dirname, 'openapi.yml')
const enforcer = EnforcerMiddleware(Enforcer(openapiPath))

enforcer.on('error', (err: Error) => {
  console.error(err)
})

const app = express()
app.use(express.json())

app.use('/api', enforcer.init())

// If using TypeScript you'll want to specify your controllers via an object with imports
// otherwise the transpiled code may not have access to the controllers.
app.use('/api', enforcer.route({
  users: import('./controllers/users')
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