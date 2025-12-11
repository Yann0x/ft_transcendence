import fastify, { FastifyRequest, FastifyReply } from 'fastify'
import fastifyStatic from '@fastify/static'
import proxy from '@fastify/http-proxy'
import {SenderIdentity} from './shared/types/user'

const server = fastify({ logger: true })

// Log incoming requests
server.addHook('onRequest', async (request, reply) => {
  console.log(`[PROXY] ${request.method} ${request.url}`);
});

// Fonction de vérification du JWT via le service authenticate
async function preHandler(request: FastifyRequest, reply: FastifyReply) {
  // si authenticate valide le JWT on set des headers avec l'identité de l'envoyeur
  console.log('Verifying JWT for request to ', request.url);

  const authHeader = request.headers.authorization
  const response = await fetch('http://authenticate:3000/check_jwt', {
    method: 'POST',
    headers: {
      'Authorization': authHeader || ''
    }
  })
  console.log('Authentication service responded with ', response);
  const sender = await response.json() as SenderIdentity | undefined
  if (sender && sender.id) {
    request.headers['x-sender-id'] = sender.id.toString()
    request.headers['x-sender-name'] = sender.name
    request.headers['x-sender-email'] = sender.email
  }
  else
    reply.status(401).send({ error: 'Unauthorized' });
}


// Routes Publique pas de vérification du JWT
server.register( async function contextPublic(server) {

  // sert les fichiers statiques du frontend
  server.register(fastifyStatic, {
    root:'/frontend/data/build', 
    prefix: '/',
  })

  server.register(proxy, {
    upstream: 'http://user:3000',
    prefix: '/user/public',
    rewritePrefix: '/user/public',
    http2: false,
  })


  server.register( async function contextPrivate(server) {
    // Applique la vérification du JWT avant le renvoi de chaque requête
    server.addHook('preHandler', preHandler);

    server.register(proxy, {
      upstream: 'http://user:3000',
      prefix: '/user',
      rewritePrefix: '/user',
      http2: false,
    })
  })
  
  server.setNotFoundHandler((request, reply) => {
    reply.sendFile('index.html')
  }) 

})


// Routes Privées avec vérification du JWT

server.listen({ port: 8080, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})