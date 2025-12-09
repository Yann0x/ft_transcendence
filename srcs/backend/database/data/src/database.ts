import fastify from 'fastify'
import { UserQuery, UserQueryResponse, UserRegister, UserUpdate } from './shared/types/user';
import * as db from './database_methods';


const server = fastify()

db.initializeDatabase();

async function preHandler(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  console.log(`Received ${request.method} request for ${request.url}`);
}

server.addHook('onRequest', preHandler);

/* GESTION USER */



server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`database listening at ${address}`)
})