import {FastifyInstance, FastifyRequest, FastifyReply}from 'fastify'
import * as userMethods from './user_methods';

const registerUserSchema = {
    schema: {
        body: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'email', 'password'],
            properties: {
                name: { type: 'string' },
                email: { type: 'string' },
                password: { type: 'string' },
                avatar: { type: 'string' },
            }
        },
        response: {
            200: { type: 'string' },
            400: { type: 'string'},
        }
    }
}
const  loginUserSchema = {
    schema: {
        body: {
            type: 'object',
            additionalProperties: false,
            required: ['email', 'password'],
            properties: {
                email: { type: 'string' },
                password: { type: 'string' },
            }
        },
        response: {
            200: { type: 'string' },
            400: { type: 'string'},
        }
    }
}
const updateUserSchema = {
    schema: {
        body: {
            type: 'object',
            additionalProperties: false,
            required: ['id'],
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                password: { type: 'string' },
                avatar: { type: 'string' },
            }
        },
        response: {
            200: { type: 'string' },
            400: { type: 'string'},
        }
    }
}

const deleteUserSchema = {
    schema: {
        body: {
            type: 'object',
            additionalProperties: false,
            required: ['id'],
            properties: {
                id: { type: 'string' },
            }
        },
        response: {
            200: { type: 'string' },
            400: { type: 'string'},
        }
    }
}

const findUserSchema = {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
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
                },
                required: ['id', 'name', 'email']
              }
            },
            400: { type: 'string' },
        }
    }
}

export function userRoutes(server: FastifyInstance) {
    server.post('/user/public/register', registerUserSchema, userMethods.registerUserHandler)
    
    server.post('/user/public/login', loginUserSchema, userMethods.loginUserHandler)

    server.put('/user/update', updateUserSchema, userMethods.updateUserHandler)

    server.delete('/user/delete', deleteUserSchema, userMethods.deleteUserHandler)

    server.get('/user/find', findUserSchema, userMethods.findUserHandler)
}
