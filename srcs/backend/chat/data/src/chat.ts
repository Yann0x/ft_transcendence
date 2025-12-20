import fastify from 'fastify'
import  swagger  from '@fastify/swagger'
import  swaggerUI  from '@fastify/swagger-ui'
import websocket from '@fastify/websocket'
import { chatRoutes } from './routes'
import handleThisError from './shared/utils/error'
import customFetch from './shared/utils/fetch'

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

server.register(websocket)

server.addHook('onRequest', async (request, reply) => {
  console.log(`[CHAT] ${request.method} ${request.url}`);
});

 //Custom error handler for schema validation
server.setErrorHandler(handleThisError);

 await server.register(swagger, {
   exposeRoute: true,
   swagger: {
     info: {
       title: 'Chat Service API',
       description: 'User management microservice',
       version: '1.0.0'
     }
   },
 });

 // Register Swagger UI
 await server.register(swaggerUI, {
   routePrefix: '/chat/docs',
   uiConfig: {
     docExpansion: 'list',
     deepLinking: false
   },
   staticCSP: true
 });

server.register(chatRoutes);


server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})
