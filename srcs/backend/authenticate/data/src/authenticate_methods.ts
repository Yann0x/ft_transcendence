import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { SenderIdentity } from './shared/types/with_front/typeBox'

export function buildGetJwtHandler(server: FastifyInstance) {
  return async (request: FastifyRequest<{ Body: SenderIdentity }>, reply: FastifyReply) => {
    const user: SenderIdentity = request.body
    const token = server.jwt.sign(user)
    return token
  }
}

export function buildCheckJwtHandler(server: FastifyInstance) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({ error: 'Unauthorized', statusCode: 401, service: 'authenticate' })
      return
    }

    const token = authHeader.replace('Bearer ', '')
    try {
      server.jwt.verify(token)
      const decoded = server.jwt.decode<SenderIdentity>(token)
      return decoded
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized', statusCode: 401, service: 'authenticate' })
      return
    }
  }
}