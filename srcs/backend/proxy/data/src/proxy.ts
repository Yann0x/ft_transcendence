import fastify, { FastifyRequest, FastifyReply } from 'fastify'
import proxy from '@fastify/http-proxy'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import fs from 'fs'
import path from 'path'
import {SenderIdentity} from './shared/with_front/types'

// self signed certificate 
const keyPath = '/certs/selfsigned.key'
const certPath = '/certs/selfsigned.crt'

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('[CERTIFICATE] TLS key/cert not found. Generate with openssl and mount to /certs.');
  process.exit(1)
}

const server = fastify({
  logger: false,
  https: {
    key: fs.readFileSync(path.resolve(keyPath)),
    cert: fs.readFileSync(path.resolve(certPath)),
  }
})

// Log WebSocket upgrade attempts
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

// JWT verification function via the authenticate service
async function checkJWT(request: FastifyRequest, reply: FastifyReply) {
  try {
    // if authenticate validates the JWT, set headers with the sender's identity
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

// Reusable WebSocket client options for forwarding auth headers
const wsClientOptionsWithAuth = {
  rewriteRequestHeaders: (headers: any, request: any) => {
    const newHeaders = { ...headers };
    // Only add auth headers if they exist (for authenticated users)
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

// // Social service with WebSocket (outside auth for now - auth handled internally)
// server.register(proxy, {
//     upstream: 'http://social:3000',
//     prefix: '/social',
//     rewritePrefix: '/social',
//     http2: false,
// 	  websocket: true,
// })
  
// Private routes with JWT verification
server.register( async function contextPrivate(server) {
  // For HTTP requests, use preHandler hook
  server.addHook('preHandler', checkJWT);

  // For WebSocket upgrades, extract token from subprotocol and add to Authorization header
  server.addHook('onRequest', async (request, reply) => {
    // Check if this is a WebSocket upgrade request
    const upgrade = request.headers.upgrade?.toLowerCase();
    if (upgrade === 'websocket') {
      // Extract token from Sec-WebSocket-Protocol header
      // Format: "Bearer.{token}" (using dot because some browsers don't allow spaces in subprotocols)
      const subprotocol = request.headers['sec-websocket-protocol'];
      if (subprotocol && subprotocol.startsWith('Bearer.')) {
        const token = subprotocol.substring(7); // Remove "Bearer." prefix
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

  // Social REST endpoints (require auth)
  server.register(proxy, {
    upstream: 'http://social:3000',
    prefix: '/social',
    rewritePrefix: '/social',
    http2: false,
    websocket: true,
    wsClientOptions: wsClientOptionsWithAuth,
  })

})

// Public routes - no JWT verification

server.register(proxy, {
  upstream: 'http://user:3000',
  prefix: '/user/public',
  rewritePrefix: '/user/public',
  http2: false,
})

// Register swagger first (required by swagger-ui)
await server.register(swagger, {
  openapi: {
    info: {
      title: 'Transcendence API Gateway',
      description: 'Centralized API documentation for all microservices',
      version: '1.0.0'
    }
  }
})

// Centralized API Documentation
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

 // Dev routes
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

// Game service (HTTP + WebSocket) - auth is handled by the game service itself
// We just forward the subprotocol header and let game service validate the JWT
server.register(proxy, {
  upstream: 'http://game:3000',
  prefix: '/api/game',
  rewritePrefix: '/game',
  http2: false,
  websocket: true,
});

  // Tournament service (HTTP + WebSocket) - Public for viewing, but creating/joining may need user info
  server.register(proxy, {
    upstream: 'http://tournament:3000',
    prefix: '/api/tournament',
    rewritePrefix: '/tournament',
    http2: false,
    websocket: true,
  });

   server.register(proxy, {
      upstream: 'http://frontend:3000',
      prefix: '/',
      rewritePrefix: '',
      http2: false,
      websocket: true, // HMR websockets
  });


server.listen({ port: 8080, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})
