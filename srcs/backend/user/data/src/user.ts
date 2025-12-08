import fastify from 'fastify'
import { UserQuery, UserQueryResponse, UserRegister, UserUpdate } from './shared/types';
import  fetchAndCheck  from './shared/types/utils';

const server = fastify()


server.post<{ Body: UserRegister }>('/public/register', async (request, reply) => {
  const newUser : UserRegister = request.body
  try { const userExists = await fetchAndCheck('http://database:3000/user', 'GET', {email: newUser.email}) as UserQueryResponse[]; }
  catch (error) {
    console.error('User doesnt exists'); 
  }
  // TODO hash password

  // Store user in database
  try 
  { 
    console.log('Creating user in database: ', newUser);
    const createResult = await fetchAndCheck('http://database:3000/user', 'POST', newUser) as boolean; 
    console.log('User creation result: ', createResult);
    
    const newRegisterUser = await fetchAndCheck('http://database:3000/user', 'GET', {email: newUser.email}) as UserQueryResponse; 
  } 
  catch (error) 
  {
    reply.status(500).send({ error: 'Database error', details: error });
    return;
  }
  try { 
    const jwt = await fetchAndCheck('http://authenticate:3000/get_jwt', 'POST', {id : newRegisterUser.id, email : newRegisterUser.email, name : newRegisterUSer.name }) as string; 
    reply.send({ jwt: jwt });
  }
  catch (error) {
    reply.status(500).send({ error: 'JWT generation error', details: error });
    return;
  }
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