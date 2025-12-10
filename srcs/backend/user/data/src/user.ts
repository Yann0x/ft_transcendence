import fastify from 'fastify'
import { UserQuery, UserQueryResponse, UserRegister, UserUpdate } from './shared/types';
import  fetchAndCheck  from './shared/types/utils';
import {userRoutes}  from './routes';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

const server = fastify()

function logRequest(request: fastify.FastifyRequest, reply: fastify.FastifyReply, done: () => void) {
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
  done();
}

server.addHook('onRequest', logRequest);

server.register(swagger, {
  routePrefix: '/docs',
  exposeRoute: true,
  swagger: {
    info: {
      title: 'User Service API',
    }
  },
});

// Register Swagger UI
await server.register(swaggerUI, {
  routePrefix: '/user/public/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  },
  staticCSP: true
});
server.register(userRoutes);


server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})