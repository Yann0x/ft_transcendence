import { FastifyInstance } from 'fastify';
import * as handlers from './user_methods';
import { ErrorResponseSchema, UserSchema, UserPublicSchema } from './shared/with_front/types';
import { Type } from '@sinclair/typebox/type';
import * as check from './shared/check_functions'

const registerUserSchema = {
  schema: {
    body: Type.Object(
      Type.Pick(UserSchema, ['name', 'email', 'password']).properties,
      { required: ['name', 'email', 'password'], additionalProperties: false }
    ),
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          user_id: { type: 'string' },
          access_token: { type: 'string' }
        }
      },
      400: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  }
};

const loginUserSchema = {
  schema: {
    body: Type.Object(
      Type.Pick(UserSchema, ['email', 'password']).properties,
      { required: ['email', 'password'], additionalProperties: false }
    ),
    response: {
      200: Type.Object({
        token: Type.String(),
        user: UserSchema
      }),
      400: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  }
};

const logoutUserSchema = {
  schema: {
    body: Type.Object(
      Type.Pick(UserSchema, ['id']).properties,
      { required: ['id'], additionalProperties: true }
    ),
    response: {
      200: Type.Object({
        token: Type.String(),
        user: UserSchema
      }),
      400: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  }
};

const findUserSchema = {
  schema: {
    querystring: Type.Pick(UserSchema, ['id', 'email', 'name']),
    response: {
      200: Type.Union([
        Type.Array(UserSchema),
        Type.Array(UserPublicSchema)
      ]),
      400: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  }
};

const updateUserSchema = {
  schema: {
    body: Type.Object(
      Type.Pick(UserSchema, ['id', 'name', 'email', 'password', 'avatar']).properties,
          { required: ['id'], additionalProperties: false },
    ),
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      },
      400: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  }
};

const deleteUserSchema = {
  schema: {
    body: Type.Object(
      Type.Pick(UserSchema, ['id']).properties,
          { required: ['id'], additionalProperties: false },
    ),
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      },
      400: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  }
}

const addFriendSchema = {
  schema: {
    description: 'Add a friend',
    body: Type.Object({
      friendId: Type.String()
    }),
    response: {
      200: Type.Object({
        success: Type.Boolean(),
        message: Type.String()
      }),
      400: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  }
};

const removeFriendSchema = {
  schema: {
    description: 'Remove a friend',
    body: Type.Object({
      friendId: Type.String()
    }),
    response: {
      200: Type.Object({
        success: Type.Boolean(),
        message: Type.String()
      }),
      400: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  }
};

const getFriendsSchema = {
  schema: {
    description: 'Get user friends list',
    response: {
      200: Type.Array(UserPublicSchema),
      400: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  }
};

export function userRoutes(server: FastifyInstance) {
  // Public routes (no auth required)
  server.post('/user/public/register', registerUserSchema, handlers.registerUserHandler);
  server.post('/user/public/login', loginUserSchema, handlers.loginUserHandler);
  server.post('/user/public/logout', logoutUserSchema, handlers.logoutUserHandler);

  // Private routes (auth required - handled by proxy)
  server.get('/user/find', findUserSchema, handlers.findUserHandler);
  server.put('/user/update', updateUserSchema, handlers.updateUserHandler);
  server.delete('/user/delete', deleteUserSchema, handlers.deleteUserHandler);

  // Friend management endpoints (authenticated)
  server.post('/user/addFriend', addFriendSchema, handlers.addFriendHandler);
  server.delete('/user/rmFriend', removeFriendSchema, handlers.removeFriendHandler);
  server.get('/user/getFriends', getFriendsSchema, handlers.getFriendsHandler);
}
