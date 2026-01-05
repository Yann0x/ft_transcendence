import fastify from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import websocket from '@fastify/websocket'
import { socialRoutes } from './routes'
import handleThisError from './shared/utils/error'
import { connectionManager } from './connection_manager'

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

server.register(websocket)

// Log WebSocket upgrade attempts
server.server.on('upgrade', (req, socket) => {
  console.log('[WEBSOCKET] upgrade start', req.url, {
    protocol: req.headers['sec-websocket-protocol'],
    origin: req.headers.origin,
  });
  socket.on('close', () => console.log('[PROXY] upgrade socket closed', req.url));
});
server.addHook('onRequest', async (request, reply) => {
  console.log(`[REQUEST] ${request.method} ${request.url}`);
});

// Custom error handler for schema validation
server.setErrorHandler(handleThisError);

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

// Register Swagger UI
await server.register(swaggerUI, {
  routePrefix: '/social/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  },
  staticCSP: true
});

server.register(socialRoutes);

server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Social Service listening at ${address}`)
})
