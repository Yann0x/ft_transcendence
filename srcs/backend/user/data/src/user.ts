import fastify from 'fastify'
import { Register } from './shared/types/user'

const server = fastify()

server.post<{Body: Register}> ('/register', async (request, reply) => {

})

server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})