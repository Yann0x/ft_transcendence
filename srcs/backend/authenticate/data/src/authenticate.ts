import fastify from 'fastify'
import jwt from '@fastify/jwt'
import { authenticateRoutes } from './routes'

const server = fastify({
  logger: true,
  ajv: {
    customOptions: {
      removeAdditional: false,
      useDefaults: true,
      coerceTypes: true,
      allErrors: true,
    },
  },
})

// Log incoming requests
server.addHook('onRequest', async (request, reply) => {
  console.log(`[AUTHENTICATE] ${request.method} ${request.url}`);
});

// Unified error handler
server.setErrorHandler((error, request, reply) => {
  if ((error as any).validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      statusCode: 400,
      service: 'authenticate',
      details: (error as any).validation,
    })
  }

  const statusCode = (error as any).statusCode || 500
  reply.status(statusCode).send({
    error: error.name || 'Internal Server Error',
    message: error.message,
    statusCode,
    service: 'authenticate',
  })
})

server.register(jwt, {
  secret: 'MOCKsupersecret',
})

// Routes
server.register(authenticateRoutes)

server.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})