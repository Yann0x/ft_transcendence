import fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'

const server = fastify({ logger: true })

const __filename  = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

server.register(fastifyStatic, {
  root:'/frontend/data/build', 
  prefix: '/',
})

server.get('/api/user/*', async (request, reply) => {
  return {user: 'response'}
})
server.get('/api/authenticate/*', async (request, reply) => {
  return {authenticate: 'response'}
})
server.get('/api/chat/*', async (request, reply) => {
  return {chat: 'response'}
})
server.get('/api/game/*', async (request, reply) => {
  return {game: 'response'}
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