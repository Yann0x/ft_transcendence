import { FastifyInstance } from "fastify"
import { Type } from '@sinclair/typebox'

import * as db from './database_methods';
import { UserSchema, UserPublicSchema, ChannelSchema } from './shared/types/with_front/typeBox'

const dbGetUserSchema = {
  schema: {
    querystring: Type.Object(
      Type.Pick(UserSchema, ['id', 'email', 'name']).properties,
      {
        anyOf: [
          { required: ['id'] },
          { required: ['email'] },
          { required: ['name'] },
        ]
      }
    ),
    response: {
      200: Type.Array(UserSchema)
    }
  }
}

const dbUpdateUserSchema = {
  schema: {
    body: Type.Object(
      UserSchema.properties,
          { required: ['id'] },
    ),
    response: {
      200: {
        oneOf: [
          { type: 'boolean' },
          { type: 'string' }
        ]
      },
    }
  }
}

const dbCreateUserSchema = {
  schema: {
    body: Type.Object(
      Type.Pick(UserSchema, ['name', 'email', 'password', 'avatar']).properties,
      { required: ['name', 'email', 'password'] }
    ),
    response: {
      200: { type: 'string' }
    }
  }
}

const dbDeleteUserSchema = {
  schema: {
    body: Type.Object(
      UserSchema.properties,
          { required: ['id'] },
    ),
    response: {
      200: { type: 'boolean' }
    }
  }
}

const dbGetPasswordSchema = {
  schema: {
    querystring: Type.Object(
      UserSchema.properties,
          { required: ['id'] },
    ),
    response: {
      200: { type: 'string' },
      404: { type: 'null' }
    }
  }
}

const dbGetChannelSchema = {
  schema: {
    querystring: Type.Object(
      ChannelSchema.properties,
          { required: ['id'] },
    ),
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type : { type: 'string' },
          members: { 
            type: 'array', 
            items: { type: 'object' }
          },
          moderators: { 
            type: 'array', 
            items: { type: 'object' }
          },
          messages: { 
            type: 'array', 
            items: { type: 'object' }
          },          
          created_by: { type: 'string' },
          created_at: { type: 'string' },
        }
      }
    }
  }
}
        
const dbUpdateChannelSchema = {
  schema: {
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: {
        id : { type: 'string' },
        name: { type: 'string' },
        type : { type: 'string' },
        members: { 
          type: 'array', 
          items: { type: 'object' }
        },
        moderators: { 
          type: 'array', 
          items: { type: 'object' }
        },
        messages: { 
          type: 'array', 
          items: { type: 'object' }
        },
      }
    },
    response: {
      200: { type: 'boolean' }
    }
  }
}
        
export function databaseRoutes(server: FastifyInstance) { 
  
  server.get('/database/user', dbGetUserSchema, db.getUser)

  server.put('/database/user', dbUpdateUserSchema, db.updateUser)

  server.post('/database/user', dbCreateUserSchema, db.createUser)

  server.delete('/database/user', dbDeleteUserSchema, db.deleteUser)

  server.get('/database/user/password_hash', dbGetPasswordSchema, db.getUserPasswordHash)

  server.get('/database/chat/channel', dbGetChannelSchema, db.getChannel)
  
}