/**
 *  @license
 *    Copyright 2018 Brigham Young University
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 **/
'use strict'
const { Pool } = require('pg')
const express = require('express')
const Enforcer = require('../..') // TODO: fix reference
const path = require('path')

const app = express()
app.use((req, res, next) => {
  const j = express.json()
  j(req, res, next)
})

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD
})

const enforcer = Enforcer(path.resolve(__dirname, 'openapi-v2.yaml'))

// this middleware will handle explicit mock requests
enforcer.mocks(path.resolve(__dirname, 'mock-controllers'), false)
  .catch(console.error)

// this middleware will handle non-mocked requests
enforcer.controllers(path.resolve(__dirname, 'controllers'), pool)
  .catch(console.error)

// this middleware will automatically run fallback mocks
enforcer.mocks(path.resolve(__dirname, 'mock-controllers'), true)
  .catch(console.error)

// add the enforcer middleware runner to the express app
app.use(enforcer.middleware())

// add error catching middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.sendStatus(err.statusCode || 500)
})

const listener = app.listen(8080, err => {
  if (err) return console.error(err.stack)
  console.log('Server listening on port ' + listener.address().port)
})