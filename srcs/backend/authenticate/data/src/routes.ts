import { FastifyInstance } from 'fastify'
import { buildCheckJwtHandler, buildGetJwtHandler, hashPassword, validHashPassword, buildOAuth42UrlHandler, buildOAuth42CallbackHandler } from './authenticate_methods'
import { ErrorResponseSchema, UserSchema } from './shared/with_front/types'
import { Type } from '@sinclair/typebox'

const getJwtSchema = {
  schema: {
    body: Type.Object(
      Type.Pick(UserSchema, ['id', 'name', 'email']).properties,
      { required: ['id', 'email'] }
    ),
    response: {
      200: { type: 'string' },
      400: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
  },
}

const checkJwtSchema = {
  schema: {
    headers: {
      type: 'object',
      properties: {
        authorization: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
        },
      },
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
  },
}
const hashPassSchema = {
  schema: {
    body : Type.String(), 
    response: {
      200: Type.String(),
      401: ErrorResponseSchema,
    },
  },
}
const checkPassSchema = {
  schema: {
    body : Type.Object({
      to_check: Type.String(),
      valid: Type.String(),
    }) ,
    response: {
      200: Type.Boolean(),
      401: ErrorResponseSchema,
    },
  },
}

export function authenticateRoutes(server: FastifyInstance) {
  server.post('/get_jwt', getJwtSchema, buildGetJwtHandler(server))
  server.post('/check_jwt', checkJwtSchema, buildCheckJwtHandler(server))
  server.post('/hash_pass', hashPassSchema, hashPassword(server))
  server.post('/check_pass_match', checkPassSchema, validHashPassword(server))

  // OAuth 2.0 with 42 API
  server.get('/authenticate/oauth/42', buildOAuth42UrlHandler(server))
  server.get('/authenticate/oauth/42/callback', buildOAuth42CallbackHandler(server))
}