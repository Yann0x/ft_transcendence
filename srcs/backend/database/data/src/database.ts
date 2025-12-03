import * as db from './database_methods'
import * as User from './shared/types/user'
import fastify from 'fastify'


const server = fastify()

 db.initDatabase('./database.db');

server.post('/user', async (request, reply) => {
  // Assuming request has been checked by Authenticate service
  const result = db.insert('users', request.body);
  console.log('Inserted user with result:', result);
  reply.send(result);
})


server.get('/user', async (request, reply) => {
  const {id, email, username} = request.query as {
    id?: string,
    email?: string,
    username?: string
    };
    if (!id && !email && !username) 
      reply.status(400).send({error: 'At least one identifier (id, email, username) must be provided'});
    const user = db.getUser(id, email, username);
    if (!user)
      reply.status(404).send({error: 'User not found'});
    else
      reply.send(user);
})

server.get('/email_exists/:email', async (request, reply) => {
  const { email } = request.params as { email: string };
  const exists = db.emailExists(email);
  reply.send({ exists });
})

server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`database listening at ${address}`)
})