import fastify from 'fastify'
import * as User from './shared/types/user'

const server = fastify()

server.get('/email_exists/:email', async (request, reply) => {
  const email = (request.params as { email: string }).email
  console.log('email_exists() called with email:', email)
  const response = await fetch('http://database:3000/email_exists/' + encodeURIComponent(email))
  const data = await response.json()
  console.log('response from db:', data)
  reply.send(data)
})


server.post('/register', async (request, reply) => {
  console.log('user_register() called with body:', request.body)
  const userData = request.body as User.Register
  if (!userData.username || !userData.email || !userData.password_hash) {
    reply.status(400).send({ error: 'Missing required fields' })
    return
  }
  let response = await fetch('http://database:3000/email_exists/' + encodeURIComponent(userData.email))
  const { exists } = await response.json()
  if (exists) {
    console.log('Email already registered:', userData.email)
    reply.status(409).send({ error: 'Email already registered' })
    return
  }
  console.log('send valid request to db:', userData)
  response = await fetch('http://database:3000/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  })
  console.log('response from db:', response)
  reply.send(await response.json())
})

server.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})