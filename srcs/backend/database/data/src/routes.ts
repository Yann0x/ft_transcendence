import { FastifyInstance } from "fastify"
import { Type } from '@sinclair/typebox'

import * as db from './database_methods';
import { UserSchema, UserPublicSchema, ChannelSchema, MessageSchema } from './shared/with_front/types'

const dbGetUserSchema = {
  schema: {
    querystring: Type.Pick(UserSchema, ['id', 'email', 'name', 'status']),
    response: {
      200: Type.Array(Type.Pick(UserSchema, ['id', 'name', 'email', 'avatar']))
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
      Type.Partial(ChannelSchema).properties,
        { required: ['id'] }
      ),
    response: {
      200: ChannelSchema
    }
  }
}

const dbPostChannelSchema = {
  schema: {
    body: Type.Object(
      Type.Pick(ChannelSchema, ['id', 'name', 'type', 'created_by', 'created_at']).properties,
      { required: ['id', 'name', 'type', 'created_by'] }
    ),
    response : {
      200: Type.Optional(ChannelSchema.id)
    }
  }
}

const dbPutChannelSchema = {
  schema: {
    body: Type.Object(
      ChannelSchema.properties,
      { required: ['id'] }
    ),
    response : {
      200: Type.Pick(ChannelSchema, ['id'])
    }
  }
}


const dbGetMessageSchema = {
  schema: {
    querystring: Type.Object(
      Type.Pick(Type.Partial(MessageSchema), ['channel_id', 'id']).properties,
        { 
          required: ['channel_id'] 
        }
    ),
    response: {
      200: Type.Array(MessageSchema)
    },
    description : `Retourne une array de Message et prend en parametres de requete l'id du channel dont on veut récupérer les 100 derniers messages. On peut passer l'id du plus anciens message pour récupérer les 100 précédents.`,
  }
}

const dbPostMessageSchema = {
  schema: {
    body: Type.Omit(MessageSchema, ['id']),
    response: {
      200: Type.Pick(MessageSchema, ['id'])
    },
    description : ``,
  }
}

const dbPutMessageSchema = {
  schema: {
    body: MessageSchema,
    response: {
      200: Type.Pick(MessageSchema, ['id'])
    },
    description : `Update message (usefull for read comfirmation)`,
  }
}

export function databaseRoutes(server: FastifyInstance) { 

  server.get('/database/user', dbGetUserSchema, db.getUser)

  server.put('/database/user', dbUpdateUserSchema, db.updateUser)

  server.post('/database/user', dbCreateUserSchema, db.createUser)

  server.delete('/database/user', dbDeleteUserSchema, db.deleteUser)

  server.get('/database/user/password_hash', dbGetPasswordSchema, db.getUserPasswordHash)

  server.get('/database/channel', dbGetChannelSchema, db.getChannel)

  server.post('/database/channel', dbPostChannelSchema, db.postChannel)

  server.put('/database/channel/name', dbPutChannelSchema, db.putChannelName)

  server.get('/database/message', dbGetMessageSchema, db.getMessage)

  server.post('/database/message', dbPostMessageSchema, db.postMessage)

  server.put('/database/message', dbPutMessageSchema, db.putMessage)

  server.post('/database/channel/member', db.postChannelMember)

  server.delete('/database/channel/member', db.deleteChannelMember)

  server.get('/database/blocked', db.getBlockedUsers)

  server.post('/database/blocked', db.postBlockUser)

  server.delete('/database/blocked', db.deleteBlockUser)

  server.get('/database/user/channels', db.getUserChannels)

  server.get('/database/channel/find-dm', db.findDMChannel)

  server.get('/database/friends', db.getFriends)

  server.post('/database/friends', db.postFriend)

  server.delete('/database/friends', db.deleteFriend)

  server.put('/database/channel/mark-read', db.markChannelRead)
}