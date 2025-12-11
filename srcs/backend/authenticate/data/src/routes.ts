import { FastifyInstance } from 'fastify'
import { buildCheckJwtHandler, buildGetJwtHandler } from './authenticate_methods'

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'number' },
    service: { type: 'string' },
    details: { type: 'object' },
  },
}

const getJwtSchema = {
  schema: {
    body: {
      type: 'object',
      required: ['id', 'name', 'email'],
      additionalProperties: false,
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
      },
    },
    response: {
      200: { type: 'string' },
      400: errorResponseSchema,
      500: errorResponseSchema,
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
      401: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
}

export function authenticateRoutes(server: FastifyInstance) {
  server.post('/get_jwt', getJwtSchema, buildGetJwtHandler(server))
  server.post('/check_jwt', checkJwtSchema, buildCheckJwtHandler(server))
}