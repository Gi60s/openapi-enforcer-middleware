/// <reference path="../../../src/interfaces.ts" />
import express from 'express'

interface User {
  id: string
  username: string
  email: string
}

export default function () {
  return {
    async addUser (req: express.Request, res: express.Response) {
      const { body, mockStore } = req.enforcer!
      if (mockStore) {
        const users = await mockStore.get('users') || []
        const newUser = Object.assign({}, body, { id: users.length })
        users.push(newUser)
        await mockStore.set('users', users)
        res.set('Location', '/api/users/' + newUser.id)
        res.status(201)
        res.enforcer.send(newUser)
      } else {
        res.status(501)
        res.send('Only mock requests are currently implemented')
      }
    },

    async deleteUser (req: express.Request, res: express.Response) {
      const { params, mockStore } = req.enforcer
      const { userId } = params
      if (mockStore) {
        const users = await mockStore.get('users') || []
        const index = users.findIndex((u: User) => u.id === userId)
        if (index !== -1) {
          users.splice(index, 1)
          await mockStore.set('users', users)
        }
        res.status(204).enforcer.send()
      } else {
        res.status(501)
        res.send('Only mock requests are currently implemented')
      }
    },

    async getUser (req: express.Request, res: express.Response) {
      const { params, mockStore } = req.enforcer
      const { userId } = params
      if (mockStore) {
        const users = await mockStore.get('users') || []
        const index = users.findIndex((u: User) => u.id === userId)
        if (index === -1) {
          res.sendStatus(404)
        } else {
          res.status(200).enforcer.send(users[index])
        }
      } else {
        res.status(501)
        res.send('Only mock requests are currently implemented')
      }
    },

    async listUsers (req: express.Request, res: express.Response) {
      const { mockStore } = req.enforcer
      if (mockStore) {
        const users = await mockStore.get('users') || []
        res.enforcer.send(users)
      } else {
        res.status(501)
        res.send('Only mock requests are currently implemented')
      }
    },

    async updateUser (req: express.Request, res: express.Response) {
      const { body, params, mockStore } = req.enforcer
      const { userId } = params
      if (mockStore) {
        const users = await mockStore.get('users') || []
        const index = users.findIndex((u: User) => u.id === userId)
        if (index !== -1) {
          Object.assign(users[index], body)
          await mockStore.set('users', users)
          res.status(200).enforcer.send(users[index])
        } else {
          res.sendStatus(404)
        }
      } else {
        res.status(501)
        res.send('Only mock requests are currently implemented')
      }
    }
  }
}