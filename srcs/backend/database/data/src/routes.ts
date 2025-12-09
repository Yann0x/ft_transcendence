import { FastifyInstance } from "fastify"
import { UserQuery, UserQueryResponse, UserRegister, UserUpdate } from "./shared/types/user";
import * as db from './database_methods';
import { queryObjects } from "v8";

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
  
  server.get('/user', dbGetUserSchema, db.getUser)

  server.put('/user', dbUpdateUserSchema, db.updateUser)

  server.post('/user', dbCreateUserSchema, db.createUser)

  server.delete('/user', dbDeleteUserSchema, db.deleteUser)

  server.get('/user/password_hash', dbGetPasswordSchema, db.getUserPasswordHash)
}