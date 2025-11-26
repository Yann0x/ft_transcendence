import fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'

const server = fastify()

const __filename  = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

server.register(fastifyStatic, {
  root: path.join(__dirname, '../../../../frontend/build'),
  prefix: '/',
})

server.get('/api/*', async (request, reply) => {
  return {api: 'response'}
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