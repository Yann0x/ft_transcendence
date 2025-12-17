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

export const TournamentSchema = Type.Object({
  id:           Type.String(),
  name:         Type.String(),
  participants: Type.Array(Type.String()),
  status:       Type.String(),
  matches:      Type.Array(MatchSchema),
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
})

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
  name:         Type.Optional(Type.String()),
  email:        Type.Optional(Type.String()),
  avatar:       Type.Optional(Type.String()),
  status:       Type.String({default: 'offline'}),
  password:     Type.Optional(Type.String()),
  friends:      Type.Optional(Type.Array(UserPublicSchema)),
  stats:        Type.Optional(StatsSchema),
  matches:      Type.Optional(Type.Array(MatchSchema)),
  tournaments:  Type.Optional(Type.Array(TournamentSchema)),
  chats:        Type.Optional(Type.Array(ChannelSchema)),
})
export type User = Static<typeof UserSchema>;

export type Channel = Static<typeof ChannelSchema>;
