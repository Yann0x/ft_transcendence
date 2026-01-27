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

// Message type enum
export const MessageTypeSchema = Type.Union([
  Type.Literal('text'),
  Type.Literal('game_invitation'),
  Type.Literal('game_result'),
  Type.Literal('tournament_invitation')
]);
export type MessageType = Static<typeof MessageTypeSchema>;

// Game invitation metadata
export const GameInvitationDataSchema = Type.Object({
  invitationId: Type.String(),
  inviterId: Type.String(),
  invitedId: Type.String(),
  status: Type.Union([
    Type.Literal('pending'),
    Type.Literal('accepted'),
    Type.Literal('declined'),
    Type.Literal('expired')
  ]),
  gameRoomId: Type.Optional(Type.String()),
  expiresAt: Type.String({ format: 'date-time' }),
  createdAt: Type.String({ format: 'date-time' })
});
export type GameInvitationData = Static<typeof GameInvitationDataSchema>;

// Tournament invitation metadata
export const TournamentInvitationDataSchema = Type.Object({
  invitationId: Type.String(),
  tournamentId: Type.String(),
  tournamentName: Type.Optional(Type.String()),
  inviterId: Type.String(),
  inviterName: Type.Optional(Type.String()),
  invitedId: Type.String(),
  status: Type.Union([
    Type.Literal('pending'),
    Type.Literal('accepted'),
    Type.Literal('declined'),
    Type.Literal('expired')
  ]),
  // Tournament live status (updated as tournament progresses)
  tournamentStatus: Type.Optional(Type.Union([
    Type.Literal('waiting'),
    Type.Literal('in_progress'),
    Type.Literal('finished')
  ])),
  // When it's the invited user's turn to play
  matchReady: Type.Optional(Type.Boolean()),
  matchId: Type.Optional(Type.String()),
  opponentName: Type.Optional(Type.String()),
  // When tournament is finished
  winnerName: Type.Optional(Type.String()),
  winnerId: Type.Optional(Type.String()),
  expiresAt: Type.String({ format: 'date-time' }),
  createdAt: Type.String({ format: 'date-time' })
});
export type TournamentInvitationData = Static<typeof TournamentInvitationDataSchema>;

// Game result metadata
export const GameResultDataSchema = Type.Object({
  invitationId: Type.String(),
  matchId: Type.Optional(Type.String()),
  winnerId: Type.String(),
  loserId: Type.String(),
  score1: Type.Number(),
  score2: Type.Number(),
  completedAt: Type.String({ format: 'date-time' })
});
export type GameResultData = Static<typeof GameResultDataSchema>;

export const MessageSchema = Type.Object({
  id:           Type.Number(),
  channel_id:   Type.String(),
  sender_id:    Type.String(),
  content:      Type.String(),
  type:         Type.Optional(MessageTypeSchema), // Default: 'text'
  metadata:     Type.Optional(Type.Any()),        // JSON metadata for special types
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
  ft_id:        Type.Optional(Type.String()),
  twoAuth_enabled: Type.Optional(Type.Union([Type.Number(), Type.Boolean()])),
  twoAuth_secret:  Type.Optional(Type.String()),
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
  // Game invitation commands
  Type.Literal('game_invitation_send'),
  Type.Literal('game_invitation_accept'),
  Type.Literal('game_invitation_decline'),
  Type.Literal('game_invitation_update'),
  Type.Literal('game_result_update'),
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

// Game invitation commands
export const SendGameInvitationCommandSchema = Type.Object({
  channelId: Type.String(),
  invitedUserId: Type.String(),
  commandId: Type.Optional(Type.String()),
});
export type SendGameInvitationCommand = Static<typeof SendGameInvitationCommandSchema>;

export const RespondGameInvitationCommandSchema = Type.Object({
  invitationId: Type.String(),
  accept: Type.Boolean(),
  commandId: Type.Optional(Type.String()),
});
export type RespondGameInvitationCommand = Static<typeof RespondGameInvitationCommandSchema>;

// Tournament invitation commands
export const SendTournamentInvitationCommandSchema = Type.Object({
  tournamentId: Type.String(),
  invitedUserId: Type.String(),
  commandId: Type.Optional(Type.String()),
});
export type SendTournamentInvitationCommand = Static<typeof SendTournamentInvitationCommandSchema>;

export const RespondTournamentInvitationCommandSchema = Type.Object({
  invitationId: Type.String(),
  accept: Type.Boolean(),
  commandId: Type.Optional(Type.String()),
});
export type RespondTournamentInvitationCommand = Static<typeof RespondTournamentInvitationCommandSchema>;

// Command response (Server → Client)
export const CommandResponseSchema = Type.Object({
  commandId: Type.Optional(Type.String()),
  originalType: Type.String(),
  success: Type.Boolean(),
  message: Type.Optional(Type.String()),
  data: Type.Optional(Type.Any()),
});
export type CommandResponse = Static<typeof CommandResponseSchema>;