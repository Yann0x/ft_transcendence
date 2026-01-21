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

// Store for WebSocket auth that needs to be passed to rewriteRequestHeaders
// Key: URL, Value: auth info
const wsAuthStore = new Map<string, { senderId: string; senderName: string; senderEmail: string }>();

// Handle WebSocket upgrade - validate JWT from query param
server.server.on('upgrade', async (req, socket) => {
  console.log('[WEBSOCKET] upgrade request', req.url, {
    protocol: req.headers['sec-websocket-protocol'],
    origin: req.headers.origin,
  });
  
  // For game/tournament WebSockets, extract and validate JWT from query param
  if (req.url && (req.url.startsWith('/api/game/ws') || req.url.startsWith('/api/tournament/ws'))) {
    try {
      const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token');
      
      if (token) {
        console.log('[WEBSOCKET] Found token in query param, validating...');
        const response = await fetch('http://authenticate:3000/check_jwt', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const sender = await response.json() as SenderIdentity | undefined;
          if (sender && sender.id) {
            // Store auth for rewriteRequestHeaders to use
            wsAuthStore.set(req.url, {
              senderId: sender.id.toString(),
              senderName: sender.name || '',
              senderEmail: sender.email || ''
            });
            console.log('[WEBSOCKET] JWT validated, user:', sender.id);
          }
        } else {
          console.log('[WEBSOCKET] JWT validation failed');
        }
      }
    } catch (error) {
      console.error('[WEBSOCKET] JWT validation error:', error);
    }
  }
  
  socket.on('close', () => {
    console.log('[WEBSOCKET] upgrade socket closed', req.url);
    // Clean up auth store
    if (req.url) wsAuthStore.delete(req.url);
  });
});
server.addHook('onRequest', async (request, reply) => {
  console.log(`[REQUEST] ${request.method} ${request.url}`);
});

// Fonction de vérification du JWT via le service authenticate
async function checkJWTNonBlock(request: FastifyRequest, reply: FastifyReply) {
  try {
    // si authenticate valide le JWT on set des headers avec l'identité de l'envoyeur
    const authHeader = request.headers.authorization
    const response = await fetch('http://authenticate:3000/check_jwt', {
      method: 'POST',
      headers: {
        'Authorization': authHeader || ''
      }
    })

    if (!response.ok) {
      return;
    }

    const sender = await response.json() as SenderIdentity | undefined
    if (sender && sender.id) {
      request.headers['x-sender-id'] = sender.id.toString()
      request.headers['x-sender-name'] = sender.name
      request.headers['x-sender-email'] = sender.email
      console.log('[JWT] Valid JWT')
    } else {
      console.log('[JWT] Invalid JWT - no sender identity in response')
      return;
    }
  } catch (error) {
    console.error('[JWT] Error validating JWT:', error);
    return;
  }
}
async function checkJWT(request: FastifyRequest, reply: FastifyReply) {
  try {
    // si authenticate valide le JWT on set des headers avec l'identité de l'envoyeur
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

// Simple passthrough for social WebSocket (auth handled via subprotocol by social service)
const wsClientOptionsPassthrough = {};

// // Social service with WebSocket (outside auth for now - auth handled internally)
// server.register(proxy, {
//     upstream: 'http://social:3000',
//     prefix: '/social',
//     rewritePrefix: '/social',
//     http2: false,
// 	  websocket: true,
// })
  
// Routes Privées avec vérification du JWT
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
    wsClientOptions: wsClientOptionsPassthrough,
  })

})

// Routes Publique pas de vérification du JWT
server.register( async function contextPublic(server) {
  // For WebSocket upgrades, extract token from query param and add to Authorization header
  server.addHook('onRequest', async (request, reply) => {
    const upgrade = request.headers.upgrade?.toLowerCase();
    if (upgrade === 'websocket') {
      // Extract token from query parameter
      const url = new URL(request.url, `https://${request.headers.host}`);
      const token = url.searchParams.get('token');
      if (token) {
        request.headers.authorization = `Bearer ${token}`;
        console.log('[PROXY] Extracted JWT from WebSocket query param');
      }
    }
  });

  // For HTTP requests, use preHandler hook
  server.addHook('preHandler', checkJWTNonBlock);

  server.register(proxy, {
    upstream: 'http://user:3000',
    prefix: '/user/public',
    rewritePrefix: '/user/public',
    http2: false,
  })

})

// Game service (HTTP + WebSocket) - with optional auth via query param token
server.register(async function gameContext(server) {
  // For HTTP requests with token, validate JWT
  server.addHook('onRequest', async (request, reply) => {
    const url = new URL(request.url, `https://${request.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (token) {
      request.headers.authorization = `Bearer ${token}`;
    }
  });

  // Non-blocking JWT validation for HTTP requests
  server.addHook('preHandler', checkJWTNonBlock);

  server.register(proxy, {
    upstream: 'http://game:3000',
    prefix: '/api/game',
    rewritePrefix: '/game',
    http2: false,
    websocket: true,
    wsClientOptions: {
      rewriteRequestHeaders: (headers: any, request: any) => {
        // Get auth from global wsAuthStore (populated by upgrade event)
        const auth = wsAuthStore.get(request.url);
        if (auth) {
          console.log('[WS-PROXY] Game: Found auth for WS:', auth.senderId);
          // Don't delete here - the close event will clean up
          return {
            ...headers,
            'x-sender-id': auth.senderId,
            'x-sender-name': auth.senderName,
            'x-sender-email': auth.senderEmail,
          };
        }
        console.log('[WS-PROXY] Game: No auth found for WS, URL:', request.url);
        return headers;
      }
    },
  });
});

// Tournament service (HTTP + WebSocket) - with optional auth
server.register(async function tournamentContext(server) {
  server.addHook('onRequest', async (request, reply) => {
    const url = new URL(request.url, `https://${request.headers.host}`);
    const token = url.searchParams.get('token');
    if (token) {
      request.headers.authorization = `Bearer ${token}`;
    }
  });

  server.addHook('preHandler', checkJWTNonBlock);

  server.register(proxy, {
    upstream: 'http://tournament:3000',
    prefix: '/api/tournament',
    rewritePrefix: '/tournament',
    http2: false,
    websocket: true,
    wsClientOptions: {
      rewriteRequestHeaders: (headers: any, request: any) => {
        const auth = wsAuthStore.get(request.url);
        if (auth) {
          return {
            ...headers,
            'x-sender-id': auth.senderId,
            'x-sender-name': auth.senderName,
            'x-sender-email': auth.senderEmail,
          };
        }
        return headers;
      }
    },
  });
});

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
