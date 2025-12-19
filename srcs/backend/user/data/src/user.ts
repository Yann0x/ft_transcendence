import fastify from 'fastify'
import { userRoutes } from './routes';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import customFetch from "./shared/utils/fetch";
import handleThisError from "./shared/utils/error";

const server = fastify({
  logger: true,
  ajv: {
    customOptions: {
      removeAdditional: false,
      useDefaults: true,
      coerceTypes: true,
      allErrors: true // Return ALL validation errors, not just first one
    }
  }
})

server.addHook('onRequest', async (request, reply) => {
  console.log(`[USER] ${request.method} ${request.url}`);
});

 //Custom error handler for schema validation
server.setErrorHandler(handleThisError);

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
