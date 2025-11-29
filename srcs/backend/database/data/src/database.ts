
// Database code 

import Database from 'better-sqlite3';

const db = new Database('/data/database.db');

// Fastify code (listen to requests on port 3000)

import fastify from 'fastify'

const server = fastify()

server.get('/*', async (request, reply) => {
  return {database: 'response'}
})

server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`database listening at ${address}`)
})