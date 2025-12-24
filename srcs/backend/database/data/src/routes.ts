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
      Type.Pick(ChannelSchema, ['name', 'type', 'created_by', 'created_at']).properties,
      { required: ['name', 'type', 'created_by'] }
    ),
    response : {
      200: Type.String()
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

const dbPutUserFriendSchema = {
  schema: {
    body: Type.Object({
      user_id: Type.String(),
      friend_id: Type.String()
    }, { required: ['user_id', 'friend_id'] }),
    response: {
      200: Type.Boolean()
    },
    description: `Send a friend request or accept an existing pending request. Returns true if request created/accepted, false if already exists or error.`,
  }
}

const dbDeleteUserFriendSchema = {
  schema: {
    body: Type.Object({
      user_id: Type.String(),
      friend_id: Type.String()
    }, { required: ['user_id', 'friend_id'] }),
    response: {
      200: Type.Boolean()
    },
    description: `Remove a friendship between two users. Returns true if removed, false if not found.`,
  }
}

const FriendshipSchema = Type.Object({
  id: Type.Optional(Type.String()),
  name: Type.Optional(Type.String()),
  avatar: Type.Optional(Type.String()),
  status: Type.String(),
  initiated_by: Type.String(),
  since: Type.String()
})

const dbGetUserFriendsSchema = {
  schema: {
    querystring: Type.Object({
      user_id: Type.String()
    }, { required: ['user_id'] }),
    response: {
      200: Type.Array(FriendshipSchema)
    },
    description: `Get all friendships for a given user with status (pending/accepted) and metadata. The calling service can filter based on status and initiated_by fields.`,
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

  server.put('/database/friend', dbPutUserFriendSchema, db.putUserFriend)

  server.delete('/database/friend', dbDeleteUserFriendSchema, db.deleteUserFriend)

  server.get('/database/friends', dbGetUserFriendsSchema, db.getUserFriends)
}
