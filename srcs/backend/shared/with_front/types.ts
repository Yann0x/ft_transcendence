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
  read_at:      Type.String({ format: 'date-time', default: null }),
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
  name:         Type.Optional(Type.String({minLength: 2, maxLength: 50, pattern: "^[\\p{L}][\\p{L}\\p{M} .'-]*$"})),
  email:        Type.Optional(Type.String({format: 'email', minLength:6, maxLength: 254})),
  avatar:       Type.Optional(Type.String()),
  status:       Type.String({default: 'offline'}),
  password:     Type.Optional(Type.String({minLength:6, maxLength: 128})),
  friends:      Type.Optional(Type.Array(UserPublicSchema)),
  stats:        Type.Optional(StatsSchema),
  matches:      Type.Optional(Type.Array(MatchSchema)),
  tournaments:  Type.Optional(Type.Array(TournamentSchema)),
  chats:        Type.Optional(Type.Array(ChannelSchema)),
})
export type User = Static<typeof UserSchema>;

// WebSocket Social Event Types
export const SocialEventTypeSchema = Type.Union([
  Type.Literal('auth'),
  Type.Literal('auth_success'),
  Type.Literal('auth_failed'),
  Type.Literal('friend_request_sent'),
  Type.Literal('friend_request_REQUESTd'),
  Type.Literal('friend_request_accepted'),
  Type.Literal('friend_request_rejected'),
  Type.Literal('friend_removed'),
  Type.Literal('user_online'),
  Type.Literal('user_offline'),
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