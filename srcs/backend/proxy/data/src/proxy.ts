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
  console.error('[PROXY] TLS key/cert not found. Generate with openssl and mount to /certs.');
  process.exit(1)
}

const server = fastify({
  logger: true,
  https: {
    key: fs.readFileSync(path.resolve(keyPath)),
    cert: fs.readFileSync(path.resolve(certPath)),
  }
})

// Log WebSocket upgrade attempts
server.server.on('upgrade', (req, socket) => {
  console.log('[PROXY] upgrade start', req.url, {
    protocol: req.headers['sec-websocket-protocol'],
    origin: req.headers.origin,
  });
  socket.on('close', () => console.log('[PROXY] upgrade socket closed', req.url));
});
server.addHook('onRequest', async (request, reply) => {
  console.log(`[PROXY] ${request.method} ${request.url}`);
});

// Fonction de vérification du JWT via le service authenticate
async function checkJWT(request: FastifyRequest, reply: FastifyReply) {
  // si authenticate valide le JWT on set des headers avec l'identité de l'envoyeur
  const authHeader = request.headers.authorization
  const response = await fetch('http://authenticate:3000/check_jwt', {
    method: 'POST',
    headers: {
      'Authorization': authHeader || ''
    }
  })
  const sender = await response.json() as SenderIdentity | undefined
  if (sender && sender.id) {
    request.headers['x-sender-id'] = sender.id.toString()
    request.headers['x-sender-name'] = sender.name
    request.headers['x-sender-email'] = sender.email
	console.log(['[PROXY] Valid JWT'])
  }
  else {
    reply.status(401).send({ error: 'Unauthorized' });
	console.log(['[PROXY] Invalid JWT'])
  }
}
  // Social service with WebSocket (outside auth for now - auth handled internally)
  server.register(proxy, {
    upstream: 'http://social:3000',
    prefix: '/social',
    rewritePrefix: '/social',
    http2: false,
	  websocket: true,
  })
// Routes Privées avec vérification du JWT
server.register( async function contextPrivate(server) {
  server.addHook('preHandler', checkJWT);

  server.register(proxy, {
    upstream: 'http://user:3000',
    prefix: '/user',
    rewritePrefix: '/user',
    http2: false,
  })

  // Social REST endpoints (require auth)
  server.register(proxy, {
    upstream: 'http://social:3000',
    prefix: '/social/friend',
    rewritePrefix: '/social/friend',
    http2: false,
  })

  server.register(proxy, {
    upstream: 'http://social:3000',
    prefix: '/social/friends',
    rewritePrefix: '/social/friends',
    http2: false,
  })

})

// Routes Publique pas de vérification du JWT

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
