import { Type, Static } from '@sinclair/typebox'

export const ErrorResponseSchema = Type.Object({
  error:     Type.Optional(Type.String()),
  message:   Type.Optional(Type.String()),
  statusCode:Type.Optional(Type.Number()),
  service:   Type.Optional(Type.String()),
  details:   Type.Optional(Type.Optional(Type.Record(Type.String(), Type.Unknown()))),
});
export type ErrorResponse = Static<typeof ErrorResponseSchema>;

export const MatchSchema = Type.Object({
  id:           Type.String(),
  player1Id:    Type.String(),
  player2Id:    Type.String(),
  score1:       Type.Number(),
  score2:       Type.Number(),
  status:       Type.String(),
})
export type Match = Static<typeof MatchSchema>;

// Tournament Player - represents a participant in a tournament
export const TournamentPlayerSchema = Type.Object({
  odIndex:      Type.Number(),                    // Original index in bracket (0 to maxPlayers-1)
  odId:         Type.String(),                    // Unique player ID for this tournament
  odAlias:      Type.String(),                    // Display name in tournament
  odUserId:     Type.Optional(Type.String()),     // User ID if logged in (undefined for guests)
  odIsCreator:  Type.Boolean(),                   // Is this player the tournament creator
})
export type TournamentPlayer = Static<typeof TournamentPlayerSchema>;

// Tournament Match - represents a single match in the bracket
export const TournamentMatchSchema = Type.Object({
  odId:         Type.String(),                    // Match unique ID
  odRound:      Type.Number(),                    // Round number (0 = first round, 1 = semi, 2 = final for 8 players)
  odMatchIndex: Type.Number(),                    // Match index within the round
  odPlayer1:    Type.Optional(TournamentPlayerSchema), // Player 1 (null if TBD)
  odPlayer2:    Type.Optional(TournamentPlayerSchema), // Player 2 (null if TBD)
  odScore1:     Type.Number(),                    // Player 1 score
  odScore2:     Type.Number(),                    // Player 2 score
  odStatus:     Type.Union([                      // Match status
    Type.Literal('pending'),      // Waiting for players to be determined
    Type.Literal('ready'),        // Both players known, waiting to start
    Type.Literal('playing'),      // Match in progress
    Type.Literal('finished'),     // Match completed
  ]),
  odWinner:     Type.Optional(TournamentPlayerSchema), // Winner of the match
  odGameRoomId: Type.Optional(Type.String()),     // Game room ID when playing
})
export type TournamentMatch = Static<typeof TournamentMatchSchema>;

// Tournament Status
export const TournamentStatusSchema = Type.Union([
  Type.Literal('waiting'),      // Waiting for players to join
  Type.Literal('in_progress'),  // Tournament started, matches being played
  Type.Literal('finished'),     // Tournament completed
])
export type TournamentStatus = Static<typeof TournamentStatusSchema>;

// Full Tournament
export const TournamentSchema = Type.Object({
  odId:           Type.String(),                  // Unique tournament ID
  odName:         Type.Optional(Type.String()),   // Optional tournament name
  odMaxPlayers:   Type.Union([Type.Literal(2), Type.Literal(4), Type.Literal(8)]), // 2, 4 or 8 players
  odStatus:       TournamentStatusSchema,
  odPlayers:      Type.Array(TournamentPlayerSchema), // Players who joined
  odMatches:      Type.Array(TournamentMatchSchema),  // All matches in bracket
  odCurrentMatch: Type.Optional(Type.String()),   // Current match ID being played
  odWinner:       Type.Optional(TournamentPlayerSchema), // Tournament winner
  odCreatedAt:    Type.String({ format: 'date-time' }),
  odCreatedBy:    TournamentPlayerSchema,         // Player who created the tournament
})
export type Tournament = Static<typeof TournamentSchema>;

export const StatsSchema = Type.Object({
  user_id:      Type.String(),
  games_played: Type.Number(),
  games_won:    Type.Number(),
  games_lost:   Type.Number(),
  win_rate:     Type.Number(),
})
export type Stats = Static<typeof StatsSchema>;

export const MessageSchema = Type.Object({
  id:           Type.Number(),
  channel_id:   Type.Number(),
  sender_id:    Type.String(),
  content:      Type.String(),
  sent_at:      Type.String({ format: 'date-time' }),
  read_at:      Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
})
export type Message = Static<typeof MessageSchema>;

export const ChannelSchema = Type.Object({
  id:           Type.Number(),
  name:         Type.String(),
  type:         Type.String(),
  members:      Type.Array(Type.String()),
  moderators:   Type.Array(Type.String()),
  messages:     Type.Array(MessageSchema),
  created_by:   Type.String(),
  created_at:   Type.String({ format: 'date-time' }),
  isBlocked:    Type.Optional(Type.Boolean()),  // True if conversation is blocked (either direction)
})
export type Channel = Static<typeof ChannelSchema>;

export const UserPublicSchema = Type.Object({
  id:           Type.Optional(Type.String()),
  name:         Type.Optional(Type.String()),
  avatar:       Type.Optional(Type.String()),
  status:       Type.Optional(Type.String({default: 'offline'})),
})
export type UserPublic = Static<typeof UserPublicSchema>;

export const UserSchema = Type.Object({
  role:         Type.Optional(Type.String({default: 'user'})),
  id:           Type.Optional(Type.String()),
  name:         Type.Optional(Type.String({maxLength: 50})),
  email:        Type.Optional(Type.String({format: 'email', minLength:6, maxLength: 254})),
  avatar:       Type.Optional(Type.String()),
  status:       Type.String({default: 'offline'}),
  password:     Type.Optional(Type.String({minLength:6, maxLength: 128})),
  friends:      Type.Optional(Type.Array(UserPublicSchema)),
  blocked_users: Type.Optional(Type.Array(Type.String())),
  stats:        Type.Optional(StatsSchema),
  matches:      Type.Optional(Type.Array(MatchSchema)),
  tournaments:  Type.Optional(Type.Array(TournamentSchema)),
  channels:     Type.Optional(Type.Array(ChannelSchema)),
})
export type User = Static<typeof UserSchema>;

// WebSocket Social Event Types
export const SocialEventTypeSchema = Type.Union([
  Type.Literal('connected'),
  Type.Literal('auth'),
  Type.Literal('auth_success'),
  Type.Literal('auth_failed'),
  Type.Literal('user_online'),
  Type.Literal('user_offline'),
  Type.Literal('message_new'),
  Type.Literal('error'),
]);
export type SocialEventType = Static<typeof SocialEventTypeSchema>;

export const SocialEventSchema = Type.Object({
  type: SocialEventTypeSchema,
  data: Type.Optional(Type.Any()),
  timestamp: Type.String({ format: 'date-time' }),
});
export type SocialEvent = Static<typeof SocialEventSchema>;

// Friend request data
export const FriendRequestDataSchema = Type.Object({
  userId: Type.String(),
  userName: Type.String(),
  userAvatar: Type.Optional(Type.String()),
});
export type FriendRequestData = Static<typeof FriendRequestDataSchema>;

// User status data
export const UserStatusDataSchema = Type.Object({
  userId: Type.String(),
  status: Type.Union([Type.Literal('online'), Type.Literal('offline')]),
});
export type UserStatusData = Static<typeof UserStatusDataSchema>;