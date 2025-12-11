import fastify from 'fastify'
import { userRoutes } from './routes';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import  customFetch  from './shared/utils';

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

// Log incoming requests
server.addHook('onRequest', async (request, reply) => {
  console.log(`[USER] ${request.method} ${request.url}`);
});

// Enforce JWT on non-public routes by calling internal authenticate service
server.addHook('preHandler', async (request, reply) => {
  if (request.url.startsWith('/user/public')) {
    return;
  }

  const authHeader = request.headers['authorization'];
  if (!authHeader) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Missing Authorization header',
      statusCode: 401,
      service: 'user'
    });
  }

  try {
    const response = await customFetch('http://authenticate:3000/check_jwt', {
      method: 'POST',
      headers: { authorization: String(authHeader) }
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return reply.status(response.status).send({
        error: 'Unauthorized',
        message: body.message || 'Invalid token',
        statusCode: response.status,
        service: 'user'
      });
    }

    // Optionally propagate sender info for downstream handlers
    const payload = await response.json().catch(() => ({}));
    if (payload?.sender?.id) {
      request.headers['x-user-id'] = payload.sender.id;
    }
  } catch (err) {
    request.log.error({ err }, '[USER] JWT verification failed');
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Token verification failed',
      statusCode: 401,
      service: 'user'
    });
  }
});

// Custom error handler for schema validation
server.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      statusCode: 400,
      service: 'user',
      details: error.validation // Contains all validation errors
    });
  }
  
  // Handle other errors
  reply.status(error.statusCode || 500).send({
    error: error.name || 'Internal Server Error',
    message: error.message,
    statusCode: error.statusCode || 500,
    service: 'user'
  });
});

server.register(swagger, {
  routePrefix: '/docs',
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