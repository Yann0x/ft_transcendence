import { FastifyInstance } from "fastify"
import * as db from './database_methods';

const dbGetUserSchema = {
  schema: {
    querystring: {
      type: 'object',
      additionalProperties: false,
      anyOf: [
        { required: ['id']},
        { required: ['email']},
        { required: ['name']},
      ],
      properties: {
        id : {type: 'string'},
        name: {type: "string"},
        email: {type: "string"},
      }
    },
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
          },
          required: ['id', 'name', 'email']
          }
        }
      }
    }
  }

const dbUpdateUserSchema = {
  schema: {
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
      }
    },
    response: {
      200: { type: 'boolean' },
    }
  }
}

const dbCreateUserSchema = {
  schema: {
    body: {
      type: 'object',
      additionalProperties: false,
      required: [ 'id', 'name', 'email', 'password'],
      properties: {
        id : { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
        avatar: { type: 'string' },
      }
    },
    response: {
      200: { type: 'boolean' }
    }
  }
}

const dbDeleteUserSchema = {
  schema: {
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: {
        id : { type: 'string' },
      }
    },
    response: {
      200: { type: 'boolean' }
    }
  }
}

const dbGetPasswordSchema = {
  schema: {
    querystring: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: {
        id : { type: 'string' },
      }
    },
    response: {
      200: { type: 'string' },
      404: { type: 'null' }
    }
  }
}

export function databaseRoutes(server: FastifyInstance) { 
  
  server.get('/database/user', dbGetUserSchema, db.getUser)

  server.put('/database/user', dbUpdateUserSchema, db.updateUser)

  server.post('/database/user', dbCreateUserSchema, db.createUser)

  server.delete('/database/user', dbDeleteUserSchema, db.deleteUser)

  server.get('/database/user/password_hash', dbGetPasswordSchema, db.getUserPasswordHash)
}