import fastify from 'fastify'


const server = fastify()

server.post('/user', async (request, reply) => {

})


server.get('/user', async (request, reply) => {
})

server.get('/email_exists/:email', async (request, reply) => {
})

server.listen({ port: 3000, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`database listening at ${address}`)
})