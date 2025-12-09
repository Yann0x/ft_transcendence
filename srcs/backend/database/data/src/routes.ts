import { FastifyInstance } from "fastify"
import { UserQuery, UserQueryResponse, UserRegister, UserUpdate } from "./shared/types/user";

const dbGetUserSchema = {
  schema: {
    querystring: {
      type: 'object',
      additionalProperties: false,
      anyOf: [
        { required: ['id']},
        { required: ['email']},
        { required: ['name']},
      ],
      properties: {
        id : {type: 'string'},
        name: {type: "string"},
        email: {type: "string"},
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
        }
      }
    }
  }

export function databaseRoutes(server: FastifyInstance) { 
  
  server.get<{
    Querystring: {id?:number, email?:string, name?:string}, 
    Response: UserQueryResponse[]}> 
    ('/user', dbGetUserSchema, async (request, reply) => {
      const {id, email, name} = request.query;
      const users = server.db.prepare(
        `SELECT id, name, email FROM users 
         WHERE (${id ? 'id = ?' : '1=1'})
         AND (${email ? 'email = ?' : '1=1'})
         AND (${name ? 'name = ?' : '1=1'})`
      ).all(
        ...(id ? [id] : []),
        ...(email ? [email] : []),
        ...(name ? [name] : [])
      ) as UserQueryResponse[];
      return users;
  })

  server.put<{Body: UserUpdate, Response: boolean}>('/user', async (request, reply) => {
  })

  server.post<{Body: UserRegister, Response: boolean}>('/user', async (request, reply) => {
  })

  server.delete<{Body: UserQuery, Response: boolean}>('/user', async (request, reply) => {
  })

  server.get<{Body: UserQuery, Response : string}>('/user/password_hash', async (request, reply) => {
  })
}