import fastify from 'fastify'
import jwt from '@fastify/jwt'
import {UserRegister} from './shared/types/user'

const server = fastify()

server.register(jwt, {
    secret: 'MOCKsupersecret'
})

server.post<{ Body: UserRegister, Response: string }>('/get_jwt', async (request, reply) => {
    const user : UserRegister = request.body
    const token = server.jwt.sign(user)
    return token
})

server.post('/check_jwt', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false
    }
    const token = authHeader.replace('Bearer ', '')
    try {
        server.jwt.verify(token)
        return true 
    } catch (err) {
        return false
    }
})

server.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})