import fastify from 'fastify'
import jwt from '@fastify/jwt'
import {SenderIdentity, UserRegister} from './shared/types/user'

const server = fastify()

server.register(jwt, {
    secret: 'MOCKsupersecret'
})

// Creation d'un JWT pour un user nouvellement connecté ou enregistré
server.post<{ Body: SenderIdentity, Response: string }>('/get_jwt', async (request, reply) => {
    const user : SenderIdentity = request.body
    const token = server.jwt.sign(user)
    return token
})

// Check d'un JWT et retourne l'identité associée si valide
server.post('/check_jwt', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.status(401).send({ error: 'Unauthorized' })
        return
    }
    const token = authHeader.replace('Bearer ', '')
    try {
        server.jwt.verify(token)
        const decoded = server.jwt.decode<SenderIdentity>(token)
        return decoded
    } catch (err) {
        reply.status(401).send({ error: 'Unauthorized' })
        return
    }
})

server.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})