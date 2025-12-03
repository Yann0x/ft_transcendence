import fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import proxy from '@fastify/http-proxy'
import path from 'path'
import { fileURLToPath } from 'url'

const server = fastify({ logger: true })

const __filename  = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

server.register(fastifyStatic, {
  root:'/frontend/data/build', 
  prefix: '/',
})

server.register(proxy, {
  upstream: 'http://user:3000',
  prefix: '/user',
  rewritePrefix: '/',
  http2: false
})

server.register(proxy, {
  upstream: 'http://authenticate:3000',
  prefix: '/authenticate',
  rewritePrefix: '/',
  http2: false
})

server.register(proxy, {
  upstream: 'http://chat:3000',
  prefix: '/chat',
  rewritePrefix: '/',
  http2: false
})

server.register(proxy, {
  upstream: 'http://game:3000',
  prefix: '/game',
  rewritePrefix: '/',
  http2: false
})

server.get('/ws/*', async (request, reply) => {
  return {websocket: 'response'}
})

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