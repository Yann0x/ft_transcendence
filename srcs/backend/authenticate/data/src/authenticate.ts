/* AUTHENTICATE */

import fastify from 'fastify'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import bcrypt from 'fastify-bcrypt'
import swaggerUI from '@fastify/swagger-ui'
import { authenticateRoutes } from './routes'
import handleThisError from './shared/utils/error';

/* SERVER */

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

/* HOOKS */

server.addHook('onRequest', async (request, reply) => {
  console.log(`[REQUEST] ${request.method} ${request.url}`);
});

/* PLUGINS */

server.register(jwt, {
  secret: 'MOCKsupersecret',
})

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

/* ROUTES */

server.register(bcrypt);
server.register(authenticateRoutes)

/* START */

server.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})
