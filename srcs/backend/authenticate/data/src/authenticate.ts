import fastify from 'fastify'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import bcrypt from 'fastify-bcrypt'
import swaggerUI from '@fastify/swagger-ui'
import { authenticateRoutes } from './routes'
import handleThisError from './shared/utils/error';

const server = fastify({
  logger: false,
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
  console.log(`[REQUEST] ${request.method} ${request.url}`);
});

server.register(jwt, {
  secret: 'MOCKsupersecret',
})

// Swagger documentation
await server.register(swagger, {
  exposeRoute: true,
  swagger: {
    info: {
      title: 'Authenticate Service API',
      description: 'Authentication and JWT management microservice',
      version: '1.0.0'
    }
  },
})

await server.register(swaggerUI, {
  routePrefix: '/authenticate/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  },
  staticCSP: true
})

// Routes
server.register(bcrypt);
server.register(authenticateRoutes)

server.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})