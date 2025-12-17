import { FastifyInstance } from 'fastify'
import { buildCheckJwtHandler, buildGetJwtHandler } from './authenticate_methods'
import { ErrorResponseSchema, UserSchema } from './shared/types/with_front/typeBox'
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

export function authenticateRoutes(server: FastifyInstance) {
  server.post('/get_jwt', getJwtSchema, buildGetJwtHandler(server))
  server.post('/check_jwt', checkJwtSchema, buildCheckJwtHandler(server))
}