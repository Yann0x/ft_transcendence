/* USER */

import fastify from 'fastify'
import { userRoutes } from './routes';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import customFetch from "./shared/utils/fetch";
import handleThisError from "./shared/utils/error";

/* SERVER */

const server = fastify({
  logger: false,
  ajv: {
    customOptions: {
      removeAdditional: false,
      useDefaults: true,
      coerceTypes: true,
      allErrors: true
    }
  }
})

/* HOOKS */

server.addHook('onRequest', async (request, reply) => {
  console.log(`[REQUEST] ${request.method} ${request.url}`);
});

server.setErrorHandler(handleThisError);

/* SWAGGER */

await server.register(swagger, {
  exposeRoute: true,
  swagger: {
    info: {
      title: 'User Service API',
      description: 'User management microservice',
      version: '1.0.0'
    }
  },
});

await server.register(swaggerUI, {
  routePrefix: '/user/public/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  },
  staticCSP: true
});

/* ROUTES */

server.register(userRoutes);

/* START */

server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})
