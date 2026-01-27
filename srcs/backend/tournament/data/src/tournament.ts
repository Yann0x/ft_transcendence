/* TOURNAMENT */

import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { registerRoutes } from './routes.js'
import { loadFinishedTournamentsFromDatabase } from './tournament_methods.js'

/* SERVER */

const fastify = Fastify({ logger: true })

/* WEBSOCKET */

await fastify.register(fastifyWebsocket)

/* SWAGGER */

await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'Tournament Service API',
      description: 'API for tournament management',
      version: '1.0.0'
    }
  }
})

await fastify.register(swaggerUi, {
  routePrefix: '/tournament/docs',
})

/* HEALTH CHECK */

fastify.get('/tournament', async () => {
  return { status: 'ok', service: 'tournament' }
})

/* ROUTES */

registerRoutes(fastify)

/* START */

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    console.log('Tournament service running on port 3000')

    setTimeout(async () => {
      await loadFinishedTournamentsFromDatabase()
    }, 2000)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
