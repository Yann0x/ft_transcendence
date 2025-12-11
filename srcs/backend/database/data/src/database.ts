import fastify from 'fastify'
import { databaseRoutes } from './routes';
import * as db from './database_methods';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

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

db.initializeDatabase();

// Log incoming requests
server.addHook('onRequest', async (request, reply) => {
  console.log(`[DATABASE] ${request.method} ${request.url}`);
});


// Custom error handler for database service
server.setErrorHandler((error, request, reply) => {
  const response = {
    error: error.name || 'DatabaseError',
    message: error.message,
    statusCode: error.statusCode || 500,
    service: 'database',
    details: error.validation || undefined
  };
  
  server.log.error(response);
  reply.status(response.statusCode).send(response);
});

server.register(swagger, {
  routePrefix: '/docs',
  exposeRoute: true,
  swagger: {
    info: {
      title: 'Database Service API',
      description: 'Database management microservice',
      version: '1.0.0'
    }
  },
});

// Register Swagger UI
await server.register(swaggerUI, {
  routePrefix: '/database/docs',
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