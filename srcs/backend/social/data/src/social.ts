/* SOCIAL */

import fastify from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import websocket from '@fastify/websocket'
import { socialRoutes } from './routes'
import handleThisError from './shared/utils/error'

/* SERVER */

const server = fastify({
  logger: false,
  ajv: {
    customOptions: {
      removeAdditional: false,
      useDefaults: true,
      coerceTypes: true,
      allErrors: true
    }
  }
})

/* WEBSOCKET */

server.register(websocket)

server.server.on('upgrade', (req, socket) => {
  console.log('[WEBSOCKET] upgrade start', req.url, {
    protocol: req.headers['sec-websocket-protocol'],
    origin: req.headers.origin,
  });
  socket.on('close', () => console.log('[SOCIAL] upgrade socket closed', req.url));
});

/* HOOKS */

server.addHook('onRequest', async (request, reply) => {
  console.log(`[REQUEST] ${request.method} ${request.url}`);
});

server.setErrorHandler(handleThisError);

/* SWAGGER */

await server.register(swagger, {
  exposeRoute: true,
  swagger: {
    info: {
      title: 'Social Service API',
      description: 'Real-time social features: friend requests, online status, notifications',
      version: '1.0.0'
    }
  },
});

await server.register(swaggerUI, {
  routePrefix: '/social/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  },
  staticCSP: true
});

/* ROUTES */

server.register(socialRoutes);

/* START */

server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Social Service listening at ${address}`)
})
