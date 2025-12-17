import { FastifyInstance } from 'fastify';
import * as handlers from './user_methods';
import { ErrorResponseSchema, UserSchema, UserPublicSchema } from './shared/types/with_front/typeBox';
import { Type } from '@sinclair/typebox/type';

const registerUserSchema = {
  schema: {
    body: Type.Object(
      Type.Pick(UserSchema, ['name', 'email', 'password', 'avatar']).properties,
      { required: ['name', 'email', 'password'] }
    ),
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          userId: { type: 'string' },
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
      { required: ['email', 'password'] }
    ),
    response: {
      200: {
        type: 'object',
        additionalProperties: true
      },
      400: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
  }
};

const findUserSchema = {
  schema: {
    querystring: Type.Object(
      Type.Pick(UserSchema, ['id', 'email', 'name']).properties,
      { additionalProperties: false,
       anyOf: [
        { required: ['id'] },
        { required: ['email'] },
        { required: ['name'] }
      ]
    }),
      200: Type.Array(UserPublicSchema),
      400: ErrorResponseSchema,
      500: ErrorResponseSchema
    }
};

const updateUserSchema = {
  schema: {
    body: Type.Object(
      Type.Pick(UserSchema, ['id', 'name', 'email', 'password', 'avatar']).properties,
          { required: ['id'] },
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
          { required: ['id'] },
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

export function userRoutes(server: FastifyInstance) {
  // Public routes (no auth required)
  server.post('/user/public/register', registerUserSchema, handlers.registerUserHandler);
  server.post('/user/public/login', loginUserSchema, handlers.loginUserHandler);
  
  // Private routes (auth required - handled by proxy)
  server.get('/user/find', findUserSchema, handlers.findUserHandler);
  server.put('/user/update', updateUserSchema, handlers.updateUserHandler);
  server.delete('/user/delete', deleteUserSchema, handlers.deleteUserHandler);
}
