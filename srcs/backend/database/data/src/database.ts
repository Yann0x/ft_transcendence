import fastify from 'fastify'
import { UserQuery, UserQueryResponse, UserRegister, UserUpdate } from './shared/types/user';
import * as db from './database_methods';


const server = fastify()

db.initializeDatabase();

/* GESTION USER */

  server.get<{Body: UserQuery, Response: UserQueryResponse[]}>('/user', async (request, reply) => {
    const users: UserQueryResponse[] = db.getUser(request.body);
    if (users.length === 0) {
      reply.status(404).send({ error: 'User not found' });
      return;
    }
    return users;
  })

  server.put<{Body: UserUpdate, Response: boolean}>('/user', async (request, reply) => {
    const result = db.updateUser(request.body);
    if (!result) {
      reply.status(404).send({ error: 'User not found or no changes made' });
      return;
    }
    return result;
  })

  server.post<{Body: UserRegister, Response: boolean}>('/user', async (request, reply) => {
    const result = db.createUser(request.body);
    if (!result) {
      reply.status(500).send({ error: 'User could not be created' });
      return;
    }
    return result;
  })

  server.delete<{Body: UserQuery, Response: boolean}>('/user', async (request, reply) => {
    const result = db.deleteUser(request.body);
    if (!result) {
      reply.status(404).send({ error: 'User not found' });
      return;
    }
    return result;
  })

  server.get<{Body: UserQuery, Response : string}>('/user/password_hash', async (request, reply) => {
    const password_hash = db.getUserPasswordHash(request.body);
    return password_hash;
  })


server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`database listening at ${address}`)
})