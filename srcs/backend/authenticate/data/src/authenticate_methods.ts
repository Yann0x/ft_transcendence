import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { SenderIdentity } from './shared/with_front/types'

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

export  function hashPassword(server: FastifyInstance)
{
  return async (req: FastifyRequest, rep: FastifyReply) => {
    const toHash = req.body as string;
    if (!toHash)
      rep.status(401).send({error: 'No pass to Hash', statusCode:401, service : 'authenticate'});
    const newHash = server.bcrypt.hash(toHash);
    return newHash;
  }
};

type validHashBody = {
  to_check: string,
  valid: string
}

export  function validHashPassword(server: FastifyInstance)
{
  return async (req: FastifyRequest<{Body: validHashBody}>, rep: FastifyReply) => {
    const toCheck = req.body?.to_check as string;
    const realHash = req.body?.valid as string;
    if (!toCheck || !realHash)
      return rep.status(401).send({error: 'Missing pass', statusCode: 401, service:  'authenticate'});
   const result = await server.bcrypt.compare(toCheck, realHash);
   if (!result)
      return rep.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid credentials',
        statusCode: 401,
        service: 'authenticate'
      });
      rep.status(200).send(true);
  }
};