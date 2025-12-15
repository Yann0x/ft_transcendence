import fastify from 'fastify'
import jwt from '@fastify/jwt'
import { authenticateRoutes } from './routes'
import handleThisError from './shared/utils/error';

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