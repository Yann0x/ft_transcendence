/* ROUTES */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { WebSocket } from 'ws'
import { Type } from '@sinclair/typebox'
import {
  createTournament,
  joinTournament,
  leaveTournament,
  getAllTournaments,
  getTournament,
  getTournamentsByStatus,
  startMatch,
  endMatch,
  updateMatchScore,
  getNextMatch,
  registerGlobalConnection,
  unregisterGlobalConnection,
  registerConnection,
  unregisterConnection,
  handlePlayerDisconnect,
} from './tournament_methods.js'
import { TournamentSchema, TournamentStatusSchema } from './shared/with_front/types.js'

/* SCHEMAS */

const CreateTournamentBody = Type.Object({
  maxPlayers: Type.Union([Type.Literal(2), Type.Literal(4), Type.Literal(8)]),
  creatorAlias: Type.String({ minLength: 1, maxLength: 20 }),
  creatorUserId: Type.Optional(Type.String()),
  name: Type.Optional(Type.String({ maxLength: 50 })),
})

const JoinTournamentBody = Type.Object({
  alias: Type.String({ minLength: 1, maxLength: 20 }),
  userId: Type.Optional(Type.String()),
})

const LeaveTournamentBody = Type.Object({
  playerId: Type.String(),
})

const StartMatchBody = Type.Object({
  matchId: Type.String(),
  gameRoomId: Type.String(),
})

const EndMatchBody = Type.Object({
  matchId: Type.String(),
  score1: Type.Number(),
  score2: Type.Number(),
})

const UpdateScoreBody = Type.Object({
  matchId: Type.String(),
  score1: Type.Number(),
  score2: Type.Number(),
})

/* Enregistre les routes du service tournoi */
export function registerRoutes(fastify: FastifyInstance): void {

  /* LIST */

  fastify.get('/tournament/list', {
    schema: {
      response: {
        200: Type.Object({
          waiting: Type.Array(TournamentSchema),
          in_progress: Type.Array(TournamentSchema),
          finished: Type.Array(TournamentSchema),
        })
      }
    }
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const waiting = getTournamentsByStatus('waiting')
    const in_progress = getTournamentsByStatus('in_progress')
    const finished = getTournamentsByStatus('finished')

    return reply.send({ waiting, in_progress, finished })
  })

  /* GET */

  fastify.get<{ Params: { id: string } }>('/tournament/:id', {
    schema: {
      params: Type.Object({
        id: Type.String()
      }),
      response: {
        200: TournamentSchema,
        404: Type.Object({ error: Type.String() })
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tournament = getTournament(request.params.id)

    if (!tournament) {
      return reply.status(404).send({ error: 'Tournament not found' })
    }

    return reply.send(tournament)
  })

  /* CREATE */

  fastify.post('/tournament/create', {
    schema: {
      body: CreateTournamentBody,
      response: {
        201: TournamentSchema,
        400: Type.Object({ error: Type.String() })
      }
    }
  }, async (request: FastifyRequest<{ Body: typeof CreateTournamentBody.static }>, reply: FastifyReply) => {
    const { maxPlayers, creatorAlias, creatorUserId, name } = request.body

    if (!creatorAlias.trim()) {
      return reply.status(400).send({ error: 'Alias is required' })
    }

    const tournament = createTournament(maxPlayers, creatorAlias.trim(), creatorUserId, name?.trim())

    return reply.status(201).send(tournament)
  })

  /* JOIN */

  fastify.post<{ Params: { id: string } }>('/tournament/:id/join', {
    schema: {
      params: Type.Object({ id: Type.String() }),
      body: JoinTournamentBody,
      response: {
        200: Type.Object({
          tournament: TournamentSchema,
          playerId: Type.String(),
        }),
        400: Type.Object({ error: Type.String() }),
        404: Type.Object({ error: Type.String() })
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: typeof JoinTournamentBody.static }>, reply: FastifyReply) => {
    const { alias, userId } = request.body

    if (!alias.trim()) {
      return reply.status(400).send({ error: 'Alias is required' })
    }

    const result = joinTournament(request.params.id, alias.trim(), userId)

    if (!result.success) {
      const status = result.error === 'Tournament not found' ? 404 : 400
      return reply.status(status).send({ error: result.error })
    }

    return reply.send({
      tournament: result.tournament,
      playerId: result.player!.odId,
    })
  })

  /* LEAVE */

  fastify.post<{ Params: { id: string } }>('/tournament/:id/leave', {
    schema: {
      params: Type.Object({ id: Type.String() }),
      body: LeaveTournamentBody,
      response: {
        200: Type.Object({ success: Type.Boolean() }),
        400: Type.Object({ error: Type.String() }),
        404: Type.Object({ error: Type.String() })
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: typeof LeaveTournamentBody.static }>, reply: FastifyReply) => {
    const { playerId } = request.body

    const result = leaveTournament(request.params.id, playerId)

    if (!result.success) {
      const status = result.error === 'Tournament not found' ? 404 : 400
      return reply.status(status).send({ error: result.error })
    }

    return reply.send({ success: true })
  })

  /* MATCH START */

  fastify.post<{ Params: { id: string } }>('/tournament/:id/match/start', {
    schema: {
      params: Type.Object({ id: Type.String() }),
      body: StartMatchBody,
      response: {
        200: Type.Object({ success: Type.Boolean() }),
        400: Type.Object({ error: Type.String() })
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: typeof StartMatchBody.static }>, reply: FastifyReply) => {
    const { matchId, gameRoomId } = request.body

    const result = startMatch(request.params.id, matchId, gameRoomId)

    if (!result.success) {
      return reply.status(400).send({ error: result.error })
    }

    return reply.send({ success: true })
  })

  /* MATCH END */

  fastify.post<{ Params: { id: string } }>('/tournament/:id/match/end', {
    schema: {
      params: Type.Object({ id: Type.String() }),
      body: EndMatchBody,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          winnerId: Type.Optional(Type.String())
        }),
        400: Type.Object({ error: Type.String() })
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: typeof EndMatchBody.static }>, reply: FastifyReply) => {
    const { matchId, score1, score2 } = request.body

    const result = endMatch(request.params.id, matchId, score1, score2)

    if (!result.success) {
      return reply.status(400).send({ error: result.error })
    }

    return reply.send({ success: true, winnerId: result.winner?.odId })
  })

  /* MATCH SCORE */

  fastify.post<{ Params: { id: string } }>('/tournament/:id/match/score', {
    schema: {
      params: Type.Object({ id: Type.String() }),
      body: UpdateScoreBody,
      response: {
        200: Type.Object({ success: Type.Boolean() })
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: typeof UpdateScoreBody.static }>, reply: FastifyReply) => {
    const { matchId, score1, score2 } = request.body

    updateMatchScore(request.params.id, matchId, score1, score2)

    return reply.send({ success: true })
  })

  /* NEXT MATCH */

  fastify.get<{ Params: { id: string } }>('/tournament/:id/next-match', {
    schema: {
      params: Type.Object({ id: Type.String() }),
      response: {
        200: Type.Object({
          hasNext: Type.Boolean(),
          match: Type.Optional(Type.Any())
        })
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const match = getNextMatch(request.params.id)

    return reply.send({
      hasNext: match !== null,
      match: match ?? undefined
    })
  })

  /* WEBSOCKET LIST */

  fastify.get('/tournament/ws', { websocket: true }, (socket: WebSocket, _request: FastifyRequest) => {
    console.log('New WebSocket connection for tournament list')

    registerGlobalConnection(socket)

    const waiting = getTournamentsByStatus('waiting')
    const in_progress = getTournamentsByStatus('in_progress')
    const finished = getTournamentsByStatus('finished')

    socket.send(JSON.stringify({
      type: 'tournaments_list',
      tournaments: { waiting, in_progress, finished }
    }))

    socket.on('message', (rawMessage: Buffer) => {
      try {
        const message = JSON.parse(rawMessage.toString())

        if (message.type === 'subscribe' && message.tournamentId) {
          registerConnection(message.tournamentId, socket)
          const tournament = getTournament(message.tournamentId)
          if (tournament) {
            socket.send(JSON.stringify({
              type: 'tournament_update',
              tournament
            }))
          }
        }

        if (message.type === 'unsubscribe' && message.tournamentId) {
          unregisterConnection(message.tournamentId, socket)
        }
      } catch (e) {
        console.error('Invalid WebSocket message:', e)
      }
    })

    socket.on('close', () => {
      console.log('WebSocket connection closed')
      unregisterGlobalConnection(socket)
      for (const tournament of getAllTournaments()) {
        unregisterConnection(tournament.odId, socket)
      }
    })
  })

  /* WEBSOCKET TOURNAMENT */

  fastify.get<{ Params: { id: string } }>('/tournament/:id/ws', { websocket: true }, (socket: WebSocket, request: FastifyRequest<{ Params: { id: string } }>) => {
    const tournamentId = request.params.id
    console.log(`New WebSocket connection for tournament: ${tournamentId}`)

    registerConnection(tournamentId, socket)

    const tournament = getTournament(tournamentId)
    if (tournament) {
      socket.send(JSON.stringify({
        type: 'tournament_update',
        tournament
      }))
    } else {
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Tournament not found'
      }))
      socket.close()
      return
    }

    socket.on('close', () => {
      console.log(`WebSocket connection closed for tournament: ${tournamentId}`)
      unregisterConnection(tournamentId, socket)
    })
  })

  /* USER STATS */

  fastify.get<{ Querystring: { user_id: string } }>('/tournament/user-stats', {
    schema: {
      querystring: Type.Object({
        user_id: Type.String()
      }),
      response: {
        200: Type.Object({
          tournaments_won: Type.Number(),
          tournaments_played: Type.Number(),
        }),
        400: Type.Object({ error: Type.String() })
      }
    }
  }, async (request: FastifyRequest<{ Querystring: { user_id: string } }>, reply: FastifyReply) => {
    const { user_id } = request.query

    if (!user_id) {
      return reply.status(400).send({ error: 'user_id is required' })
    }

    const allTournaments = getAllTournaments()

    let tournaments_won = 0
    let tournaments_played = 0

    for (const tournament of allTournaments) {
      const participated = tournament.odPlayers.some(p => p.odUserId === user_id)
      if (participated) {
        tournaments_played++

        if (tournament.odStatus === 'finished' && tournament.odWinner?.odUserId === user_id) {
          tournaments_won++
        }
      }
    }

    return reply.send({ tournaments_won, tournaments_played })
  })
}
