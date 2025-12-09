import fastify, { FastifyRequest, FastifyReply } from 'fastify'
import fastifyStatic from '@fastify/static'
import proxy from '@fastify/http-proxy'
import {SenderIdentity} from './shared/types/user'

const server = fastify({ logger: true })

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
    return
  }
  else
    reply.status(401).send({ error: 'Unauthorized request'});
}



// Routes Privées avec vérification du JWT
server.register( async function contextPrivate(server) {
  // Applique la vérification du JWT avant le renvoi de chaque requête
  server.addHook('preHandler', preHandler);

  server.register(proxy, {
    upstream: 'http://user:3000',
    prefix: '/api/user',
    rewritePrefix: '/',
    http2: false,
  })
})

// Routes Publique pas de vérification du JWT
server.register( async function contextPublic(server) {
  server.register(proxy, {
    upstream: 'http://user:3000',
    prefix: '/api/public/user',
    rewritePrefix: '/public',
    http2: false,
  })

  // sert les fichiers statiques du frontend
  server.register(fastifyStatic, {
    root:'/frontend/data/build', 
    prefix: '/',
  })
  // fallback sur index.html pour le routing coté client
  server.setNotFoundHandler((request, reply) => {
    reply.sendFile('index.html')
  })

  //DEV
    server.register(proxy, {
    upstream: 'http://database:3000',
    prefix: '/api/docs/database',
    rewritePrefix: '/docs',
    http2: false,
  })

})

server.listen({ port: 8080, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})