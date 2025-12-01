import fastify from 'fastify'
import { UserRegister } from './shared/types/user.js'

const server = fastify()

server.post<{Body: UserRegister}> ('/register', async (request, reply) => {
  console.log("Received registration:", request.body)

})

server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})