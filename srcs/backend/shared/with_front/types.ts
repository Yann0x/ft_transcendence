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
  channel_id:   Type.String(),
  sender_id:    Type.String(),
  content:      Type.String(),
  sent_at:      Type.String({ format: 'date-time' }),
  read_at:      Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
})
export type Message = Static<typeof MessageSchema>;

export const ChannelSchema = Type.Object({
  id:           Type.String(),
  name:         Type.Optional(Type.String()),
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
  stats:        Type.Optional(StatsSchema),
  matches:      Type.Optional(Type.Array(MatchSchema)),
  tournaments:  Type.Optional(Type.Array(TournamentSchema)),
  channels:     Type.Optional(Type.Array(ChannelSchema)),
})
export type User = Static<typeof UserSchema>;

export const FriendshipSchema = Type.Object({
  id:           Type.Optional(Type.Number()),
  user1:       UserSchema,
  user2:       UserSchema,
  status:      Type.Union([Type.Literal('pending'), Type.Literal('accepted'), Type.Literal('rejected')]),
  createdAt:    Type.String({ format: 'date-time' }), 
})
export type Friendship = Static<typeof FriendshipSchema>;

export const BlockedUserSchema = Type.Object({
  id:           Type.Optional(Type.Number()),
  blockerId:   UserSchema,
  blockedId:   UserSchema,
  createdAt:    Type.String({ format: 'date-time' }),
})
export type BlockedUser = Static<typeof BlockedUserSchema>;

// Helper function to generate sorted composite keys for friendships and blocked users
export function generateFriendshipKey(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('-');
}

// Login response with all necessary data for frontend
export const LoginResponseSchema = Type.Object({
  user: UserSchema,                                  // Current user data
  cachedUsers: Type.Array(UserPublicSchema),         // All users to cache (friends + blocked + online)
  friendIds: Type.Array(Type.String()),              // Friend IDs for building friendsMap
  blockedIds: Type.Array(Type.String()),             // Blocked user IDs for building blockedUsersMap
  token: Type.Optional(Type.String()),               // Auth token (if login returns it)
});
export type LoginResponse = Static<typeof LoginResponseSchema>;

// WebSocket Social Event Types
export const SocialEventTypeSchema = Type.Union([
  // Server → Client events (broadcasts)
  Type.Literal('connected'),
  Type.Literal('users_online'),
  Type.Literal('user_online'),
  Type.Literal('user_offline'),
  Type.Literal('user_update'),
  Type.Literal('channel_update'),
  Type.Literal('message_new'),
  Type.Literal('friend_add'),
  Type.Literal('friend_remove'),
  Type.Literal('error'),
  // Client → Server commands
  Type.Literal('add_friend'),
  Type.Literal('remove_friend'),
  Type.Literal('send_message'),
  Type.Literal('block_user'),
  Type.Literal('unblock_user'),
  Type.Literal('mark_read'),
  // Server → Client command responses
  Type.Literal('command_success'),
  Type.Literal('command_error'),
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

// Command payloads (Client → Server)
export const AddFriendCommandSchema = Type.Object({
  friendId: Type.String(),
  commandId: Type.Optional(Type.String()),
});
export type AddFriendCommand = Static<typeof AddFriendCommandSchema>;

export const RemoveFriendCommandSchema = Type.Object({
  friendId: Type.String(),
  commandId: Type.Optional(Type.String()),
});
export type RemoveFriendCommand = Static<typeof RemoveFriendCommandSchema>;

export const SendMessageCommandSchema = Type.Object({
  channelId: Type.String(),
  content: Type.String(),
  commandId: Type.Optional(Type.String()),
});
export type SendMessageCommand = Static<typeof SendMessageCommandSchema>;

export const BlockUserCommandSchema = Type.Object({
  userId: Type.String(),
  commandId: Type.Optional(Type.String()),
});
export type BlockUserCommand = Static<typeof BlockUserCommandSchema>;

export const UnblockUserCommandSchema = Type.Object({
  userId: Type.String(),
  commandId: Type.Optional(Type.String()),
});
export type UnblockUserCommand = Static<typeof UnblockUserCommandSchema>;

export const MarkReadCommandSchema = Type.Object({
  channelId: Type.String(),
  commandId: Type.Optional(Type.String()),
});
export type MarkReadCommand = Static<typeof MarkReadCommandSchema>;

// Command response (Server → Client)
export const CommandResponseSchema = Type.Object({
  commandId: Type.Optional(Type.String()),
  originalType: Type.String(),
  success: Type.Boolean(),
  message: Type.Optional(Type.String()),
  data: Type.Optional(Type.Any()),
});
export type CommandResponse = Static<typeof CommandResponseSchema>;