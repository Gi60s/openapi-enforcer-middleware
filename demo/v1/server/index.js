'use strict'
const { Pool } = require('pg')
const express = require('express')
const Enforcer = require('openapi-enforcer-middleware')
const path = require('path')

const app = express()
app.use(express.json())

const enforcer = Enforcer(path.resolve(__dirname, 'openapi-v2.yaml'))

// this middleware will handle explicit mock requests
enforcer.mocks(path.resolve(__dirname, 'mock-controllers'), false)
  .catch(console.error)

// this middleware will handle non-mocked requests
if (process.env.POSTGRES_HOST) {
  const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD
  })

  enforcer.controllers(path.resolve(__dirname, 'controllers'), pool)
    .catch(console.error)
}

// this middleware will automatically run fallback mocks
enforcer.mocks(path.resolve(__dirname, 'mock-controllers'), true)
  .catch(console.error)

// add the enforcer middleware runner to the express app
app.use(enforcer.middleware())

// add error catching middleware
app.use((err, req, res, next) => {
  if (err.statusCode >= 400 && err.statusCode < 500 && err.exception) {
    res.set('Content-Type', 'text/plain')
    res.status(err.statusCode)
    res.send(err.message)
  } else {
    console.error(err.stack)
    res.sendStatus(err.statusCode || 500)
  }
})

const listener = app.listen(3000, err => {
  if (err) return console.error(err.stack)
  console.log('Server listening on port ' + listener.address().port)
})
