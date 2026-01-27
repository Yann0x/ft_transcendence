/* DATABASE */

import fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import ajvFormats from 'ajv-formats'
import { databaseRoutes } from './routes';
import * as db from './database_methods';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui'
import handleThisError from './shared/utils/error'

/* SERVER */

const server = fastify({
  logger: false,
  ajv: {
    customOptions: {
      removeAdditional: false,
      useDefaults: true,
      coerceTypes: true,
      allErrors: true
    },
    plugins: [ajvFormats]
  }
}).withTypeProvider<TypeBoxTypeProvider>()

/* INIT */

db.initializeDatabase();

/* HOOKS */

server.addHook('onRequest', async (request, reply) => {
  console.log(`[REQUEST] ${request.method} ${request.url}`);
});

server.setErrorHandler(handleThisError);

/* SWAGGER */

server.register(swagger, {
  exposeRoute: true,
  swagger: {
    info: {
      title: 'Database Service API',
      description: 'Database management microservice',
      version: '1.0.0'
    }
  },
});

await server.register(swaggerUI, {
  routePrefix: '/database/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  },
  staticCSP: true
});

/* ROUTES */

server.register(databaseRoutes);

/* START */

server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`database listening at ${address}`)
})
