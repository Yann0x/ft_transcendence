import fastify from 'fastify'
import { UserQuery, UserQueryResponse, UserRegister, UserUpdate } from './shared/types';
import  fetchAndCheck  from './shared/types/utils';

const server = fastify()


server.post<{ Body: UserRegister }>('/public/register', async (request, reply) => {
  // TODO validate request body
  // TODO hash password

  // Store user in database
  //return JWT to client
})

server.put<{ Body: UserUpdate, Response: {success: boolean}}>('/update', async (request, reply) => {
  // TODO vérifier JWT
  // TODO update user in database
  // TODO return success status
})

server.delete<{ Body: UserQuery, Response: {success: boolean}}>('/delete', async (request, reply) => {
  // TODO vérifier JWT
  // TODO delete user from database
  // TODO return success status
})

server.get<{ Body: UserQuery, Response: UserQueryResponse[] }>('/find', async (request, reply) => {
  // TODO vérifier JWT
  // TODO get user from database
    // Si valid JWT 
      // Si admin OU meme user
        //  return UserQuery 
    // Sinon return UserPublic
})

server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})