import fastify, { FastifyRequest, FastifyReply } from 'fastify'
import fastifyStatic from '@fastify/static'
import proxy from '@fastify/http-proxy'
import {SenderIdentity} from './shared/types/user'

const server = fastify({ logger: true })

// Fonction de vérification du JWT via le service authenticate
async function preHandler(request: FastifyRequest, reply: FastifyReply) {
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
    return
  }
}

// Applique la vérification du JWT avant le renvoi de chaque requête
server.addHook('preHandler', preHandler);


server.register(proxy, {
  upstream: 'http://user:3000',
  prefix: '/user',
  rewritePrefix: '/',
  http2: false,
})

server.register(proxy, {
  upstream: 'http://game:3000',
  prefix: '/game',
  rewritePrefix: '/',
  http2: false
})

server.get('/wss/*', async (request, reply) => {
  return {websocket: 'response'}
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

server.listen({ port: 8080, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})