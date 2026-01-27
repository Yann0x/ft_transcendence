/* PROXY */

import fastify, { FastifyRequest, FastifyReply } from 'fastify'
import proxy from '@fastify/http-proxy'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import fs from 'fs'
import path from 'path'
import {SenderIdentity} from './shared/with_front/types'

/* CERTIFICATE */

const keyPath = '/certs/selfsigned.key'
const certPath = '/certs/selfsigned.crt'

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('[CERTIFICATE] TLS key/cert not found. Generate with openssl and mount to /certs.');
  process.exit(1)
}

/* SERVER */

const server = fastify({
  logger: false,
  https: {
    key: fs.readFileSync(path.resolve(keyPath)),
    cert: fs.readFileSync(path.resolve(certPath)),
  }
})

/* HOOKS */

server.server.on('upgrade', (req, socket) => {
  console.log('[WEBSOCKET] upgrade request', req.url, {
    protocol: req.headers['sec-websocket-protocol'],
    origin: req.headers.origin,
  });
  socket.on('close', () => console.log('[WEBSOCKET] upgrade socket closed', req.url));
});

server.addHook('onRequest', async (request, reply) => {
  console.log(`[REQUEST] ${request.method} ${request.url}`);
});

/* JWT CHECK */

async function checkJWT(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization
    const response = await fetch('http://authenticate:3000/check_jwt', {
      method: 'POST',
      headers: {
        'Authorization': authHeader || ''
      }
    })

    if (!response.ok) {
      reply.status(401).send({ error: 'Unauthorized' });
      console.log('[JWT] Invalid JWT - authentication service rejected token');
      return;
    }

    const sender = await response.json() as SenderIdentity | undefined
    if (sender && sender.id) {
      request.headers['x-sender-id'] = sender.id.toString()
      request.headers['x-sender-name'] = sender.name
      request.headers['x-sender-email'] = sender.email
      console.log('[JWT] Valid JWT')
    } else {
      reply.status(401).send({ error: 'Unauthorized' });
      console.log('[JWT] Invalid JWT - no sender identity in response')
      return;
    }
  } catch (error) {
    console.error('[JWT] Error validating JWT:', error);
    reply.status(503).send({ error: 'Authentication service unavailable' });
    return;
  }
}

/* WEBSOCKET OPTIONS */

const wsClientOptionsWithAuth = {
  rewriteRequestHeaders: (headers: any, request: any) => {
    const newHeaders = { ...headers };
    if (request.headers['x-sender-id']) {
      newHeaders['x-sender-id'] = request.headers['x-sender-id'];
    }
    if (request.headers['x-sender-name']) {
      newHeaders['x-sender-name'] = request.headers['x-sender-name'];
    }
    if (request.headers['x-sender-email']) {
      newHeaders['x-sender-email'] = request.headers['x-sender-email'];
    }
    return newHeaders;
  }
};

/* PRIVATE ROUTES */

server.register( async function contextPrivate(server) {
  server.addHook('preHandler', checkJWT);

  server.addHook('onRequest', async (request, reply) => {
    const upgrade = request.headers.upgrade?.toLowerCase();
    if (upgrade === 'websocket') {
      const subprotocol = request.headers['sec-websocket-protocol'];
      if (subprotocol && subprotocol.startsWith('Bearer.')) {
        const token = subprotocol.substring(7);
        request.headers.authorization = `Bearer ${token}`;
        console.log('[PROXY] Extracted JWT from WebSocket subprotocol');
      }
    }
  });

  server.register(proxy, {
    upstream: 'http://user:3000',
    prefix: '/user',
    rewritePrefix: '/user',
    http2: false,
  })

  server.register(proxy, {
    upstream: 'http://social:3000',
    prefix: '/social',
    rewritePrefix: '/social',
    http2: false,
    websocket: true,
    wsClientOptions: wsClientOptionsWithAuth,
  })
})

/* PUBLIC ROUTES */

server.register(proxy, {
  upstream: 'http://user:3000',
  prefix: '/user/public',
  rewritePrefix: '/user/public',
  http2: false,
})

/* SWAGGER */

await server.register(swagger, {
  openapi: {
    info: {
      title: 'Transcendence API Gateway',
      description: 'Centralized API documentation for all microservices',
      version: '1.0.0'
    }
  }
})

await server.register(async function publicDocs(instance) {
  await instance.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      urls: [
        {
          name: 'Authenticate API (Internal)',
          url: '/authenticate/docs/json'
        },
        {
          name: 'Database API (Internal)',
          url: '/database/docs/json'
        },
        {
          name: 'User API',
          url: '/user/public/docs/json'
        },
        {
          name: 'Chat API',
          url: '/chat/docs/json'
        },
        {
          name: 'Game API',
          url: '/game/docs/json'
        }
      ],
      "urls.primaryName": "User API"
    },
    staticCSP: true
  })
})

/* DEV ROUTES */

server.register(proxy, {
  upstream: 'http://database:3000',
  prefix: '/database',
  rewritePrefix: '/database',
  http2: false,
})

server.register(proxy, {
  upstream: 'http://authenticate:3000',
  prefix: '/authenticate',
  rewritePrefix: '/authenticate',
  http2: false,
})

/* GAME SERVICE */

server.register(proxy, {
  upstream: 'http://game:3000',
  prefix: '/api/game',
  rewritePrefix: '/game',
  http2: false,
  websocket: true,
});

/* TOURNAMENT SERVICE */

server.register(proxy, {
  upstream: 'http://tournament:3000',
  prefix: '/api/tournament',
  rewritePrefix: '/tournament',
  http2: false,
  websocket: true,
});

/* FRONTEND */

server.register(proxy, {
  upstream: 'http://frontend:3000',
  prefix: '/',
  rewritePrefix: '',
  http2: false,
  websocket: true,
});

/* START */

server.listen({ port: 8080, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})
