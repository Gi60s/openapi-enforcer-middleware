'use strict'

module.exports = function (dbClient) {
  return {
    addTask: async (req, res) => {
      // no need to validate the body because
      // the middleware has already validated the request
      const query = {
        text: 'INSERT INTO tasks (title, completed, due) VALUES ($1, $2, $3) RETURNING *',
        values: [ req.body.title, req.body.completed, req.body.due ]
      }
      const { rows } = await dbClient.query(query)

      // the response will be validated and serialized by the middleware
      res.send(rows[0])
    },

    deleteTask: async (req, res) => {
      const query = {
        text: 'DELETE FROM tasks WHERE id = $1',
        values: [ req.params.task_id ]
      }
      await dbClient.query(query)

      // the response will be validated and serialized by the middleware
      res.sendStatus(204)
    },

    getList: async (req, res) => {
      // no need to validate the body because
      // the middleware has already validated the request
      const query = {
        text: 'SELECT * FROM tasks',
        values: [ ]
      }
      const { rows } = await dbClient.query(query)

      // the response will be validated and serialized by the middleware
      res.send(rows)
    },

    getTask: async (req, res) => {
      // no need to validate the body because
      // the middleware has already validated the request
      const query = {
        text: 'SELECT * FROM tasks WHERE id = $1',
        values: [ req.params.task_id ]
      }
      const { rows } = await dbClient.query(query)

      // the response will be validated and serialized by the middleware
      res.send(rows[0])
    },

    updateTask: async (req, res) => {
      const query = {
        text: 'UPDATE tasks SET title = $1, completed = $2, due = $3 WHERE id = $4 RETURNING *',
        values: [ req.body.title, req.body.completed, req.body.due, req.params.task_id ]
      }
      const { rows } = await dbClient.query(query)
      res.send(rows[0])
    }
  }
}
