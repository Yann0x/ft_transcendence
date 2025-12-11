import { FastifyInstance } from 'fastify';
import * as handlers from './user_methods';

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'number' },
    service: { type: 'string' },
    details: { type: 'object' }
  }
};

const registerUserSchema = {
  schema: {
    body: {
      type: 'object',
      required: ['name', 'email', 'password'],
      additionalProperties: false,
      properties: {
        id: { type: 'string' },
        name: { type: 'string', minLength: 2, maxLength: 50 },
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
        avatar: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          userId: { type: 'string' },
          access_token: { type: 'string' }
        }
      },
      400: errorResponseSchema,
      500: errorResponseSchema
    }
  }
};

const loginUserSchema = {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password'],
      additionalProperties: false,
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 }
      }
    },
    response: {
      200: {
        type: 'object',
        additionalProperties: true
      },
      400: errorResponseSchema,
      500: errorResponseSchema
    }
  }
};

const findUserSchema = {
  schema: {
    querystring: {
      type: 'object',
      additionalProperties: false,
      anyOf: [
        { required: ['id'] },
        { required: ['email'] },
        { required: ['name'] }
      ],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            avatar: { type: 'string' },
            role: { type: 'string', enum: ['guest', 'user', 'admin'] }
          }
        }
      },
      400: errorResponseSchema,
      500: errorResponseSchema
    }
  }
};

const updateUserSchema = {
  schema: {
    body: {
      type: 'object',
      required: ['id'],
      additionalProperties: false,
      properties: {
        id: { type: 'string' },
        name: { type: 'string', minLength: 2, maxLength: 50 },
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
        avatar: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      },
      400: errorResponseSchema,
      500: errorResponseSchema
    }
  }
};

const deleteUserSchema = {
  schema: {
    body: {
      type: 'object',
      required: ['id'],
      additionalProperties: false,
      properties: {
        id: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      },
      400: errorResponseSchema,
      500: errorResponseSchema
    }
  }
}

export function userRoutes(server: FastifyInstance) {
  // Public routes (no auth required)
  server.post('/user/public/register', registerUserSchema, handlers.registerUserHandler);
  server.post('/user/public/login', loginUserSchema, handlers.loginUserHandler);
  
  // Private routes (auth required - handled by proxy)
  server.get('/user/find', findUserSchema, handlers.findUserHandler);
  server.put('/user/update', updateUserSchema, handlers.updateUserHandler);
  server.delete('/user/delete', deleteUserSchema, handlers.deleteUserHandler);
}
