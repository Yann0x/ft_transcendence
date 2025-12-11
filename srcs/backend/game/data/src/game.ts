import fastify from 'fastify'

const server = fastify()

// Log incoming requests
server.addHook('onRequest', async (request, reply) => {
  console.log(`[GAME] ${request.method} ${request.url}`);
});

server.get('/game', async (request, reply) => {
  return {game: 'response'}
})

server.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})