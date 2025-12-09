import fastify from 'fastify'
import { UserQuery, UserQueryResponse, UserRegister, UserUpdate } from './shared/types/user';
import { databaseRoutes } from './routes';
import * as db from './database_methods';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

const server = fastify()

db.initializeDatabase();

async function preHandler(request: fastify.FastifyRequest, reply: fastify.FastifyReply) {
  console.log(`Received ${request.method} request for ${request.url}`);
}

server.addHook('onRequest', preHandler);

/* GESTION USER */

server.register(swagger, {
  routePrefix: '/docs',
  exposeRoute: true,
  swagger: {
    info: {
      title: 'Database Service API',
    }
  },
});

// Register Swagger UI
await server.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  },
  staticCSP: true
});

server.register(databaseRoutes);


server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`database listening at ${address}`)
})