# ft_transcendence API Endpoints Documentation

This document defines the request and response types for all API endpoints in the ft_transcendence project.

## Table of Contents

- [Authentication API](#authentication-api)
- [User Management API](#user-management-api)
- [Game API](#game-api)
- [Chat API](#chat-api)

---

## Authentication API

Base path: `/api/authenticate`

### POST /api/authenticate/register

Register a new user account.

**Request Body:**
```typescript
{
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}
```

**Response (201 Created):**
```typescript
{
  success: true;
  data: {
    userId: string;
    username: string;
    email: string;
    createdAt: string;
  };
  message: string;
}
```

**Error Response (400/409):**
```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    field?: string;
  };
}
```

---

### POST /api/authenticate/login

Authenticate user and create session.

**Request Body:**
```typescript
{
  username: string;
  password: string;
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    userId: string;
    username: string;
    email: string;
  };
  message: string;
}
```

**Error Response (401):**
```typescript
{
  success: false;
  error: {
    code: string; // "INVALID_CREDENTIALS","ACCOUNT_LOCKED"
    message: string;
  };
}
```

---

### POST /api/authenticate/logout

End user session.

**Request Headers:**
```typescript
{
  Authorization: string;  // "Bearer <token>"
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  message: string;
}
```

---


## User Management API

Base path: `/api/user`

### GET /api/user/profile

Get current user's profile.

**Request Headers:**
```typescript
{
  Authorization: string;
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    userId: string;
    username: string;
    displayName: string;
    email: string;
    avatar?: string;       // URL or base64
    stats: {
      gamesPlayed: number;
      wins: number;
      losses: number;
      winRate: number;     // Percentage
      rank?: number;
    };
    friends: string[];     // Array of user IDs
    onlineStatus: "online" | "offline" | "in-game";
    createdAt: string;
    lastLogin: string;
  };
}
```

---

### GET /api/user/profile/:userId

Get another user's public profile.

**Request Headers:**
```typescript
{
  Authorization: string;
}
```

**Path Parameters:**
```typescript
{
  userId: string;
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    userId: string;
    username: string;
    displayName: string;
    avatar?: string;
    stats: {
      gamesPlayed: number;
      wins: number;
      losses: number;
      winRate: number;
    };
    onlineStatus: "online" | "offline" | "in-game";
    isFriend: boolean;     // Relationship to requesting user
    isBlocked: boolean;
  };
}
```

---

### PUT /api/user/profile

Update user profile.

**Request Headers:**
```typescript
{
  Authorization: string;
  Content-Type: "multipart/form-data" | "application/json";
}
```

**Request Body:**
```typescript
{
  displayName?: string;
  avatar?: File | string; // File upload or base64
  email?: string;
  currentPassword?: string; // Required if changing email/password
  newPassword?: string;
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    userId: string;
    username: string;
    displayName: string;
    avatar?: string;
    email: string;
  };
  message: string;
}
```

---

### GET /api/user/friends

Get user's friend list.

**Request Headers:**
```typescript
{
  Authorization: string;
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    friends: Array<{
      userId: string;
      username: string;
      displayName: string;
      avatar?: string;
      onlineStatus: "online" | "offline" | "in-game";
      lastSeen?: string;
    }>;
    pendingRequests: Array<{
      userId: string;
      username: string;
      displayName: string;
      avatar?: string;
      requestedAt: string;
    }>;
  };
}
```

---

### POST /api/user/friends/add

Send friend request.

**Request Headers:**
```typescript
{
  Authorization: string;
}
```

**Request Body:**
```typescript
{
  userId: string;          // User to add
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  message: string;
}
```

---

### POST /api/user/friends/accept

Accept friend request.

**Request Body:**
```typescript
{
  userId: string;          // User who sent request
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  message: string;
}
```

---

### DELETE /api/user/friends/:userId

Remove friend or reject request.

**Path Parameters:**
```typescript
{
  userId: string;
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  message: string;
}
```

---

### POST /api/user/block

Block a user.

**Request Body:**
```typescript
{
  userId: string;
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  message: string;
}
```

---

### DELETE /api/user/block/:userId

Unblock a user.

**Response (200 OK):**
```typescript
{
  success: true;
  message: string;
}
```

---

### GET /api/user/match-history

Get user's match history.

**Query Parameters:**
```typescript
{
  limit?: number;          // Default: 50, Max: 100
  offset?: number;         // Default: 0
  gameType?: "pong" | "other";
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    matches: Array<{
      matchId: string;
      gameType: string;
      players: Array<{
        userId: string;
        username: string;
        score: number;
      }>;
      winner: string;      // userId of winner
      duration: number;    // Match duration in seconds
      playedAt: string;
      tournamentId?: string;
    }>;
    total: number;
    hasMore: boolean;
  };
}
```

---

### DELETE /api/user/account

Delete user account (GDPR compliance).

**Request Headers:**
```typescript
{
  Authorization: string;
}
```

**Request Body:**
```typescript
{
  password: string;        // Confirmation
  reason?: string;         // Optional feedback
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  message: string;
}
```

---

## Game API

Base path: `/api/game`

### POST /api/game/create

Create a new game session.

**Request Headers:**
```typescript
{
  Authorization: string;
}
```

**Request Body:**
```typescript
{
  gameType: "pong" | "other";
  mode: "1v1" | "multiplayer" | "ai";
  isPrivate?: boolean;     // Default: false
  maxPlayers?: number;     // For multiplayer (3-6)
  customization?: {
    powerUps?: boolean;
    mapVariant?: string;
    difficulty?: "easy" | "medium" | "hard"; // For AI
  };
}
```

**Response (201 Created):**
```typescript
{
  success: true;
  data: {
    gameId: string;
    gameType: string;
    mode: string;
    status: "waiting" | "starting" | "in-progress";
    players: Array<{
      userId: string;
      username: string;
      isReady: boolean;
    }>;
    maxPlayers: number;
    websocketUrl: string;  // WebSocket connection URL
    createdAt: string;
  };
}
```

---

### GET /api/game/:gameId

Get game session details.

**Path Parameters:**
```typescript
{
  gameId: string;
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    gameId: string;
    gameType: string;
    mode: string;
    status: "waiting" | "starting" | "in-progress" | "finished";
    players: Array<{
      userId: string;
      username: string;
      score: number;
      isReady: boolean;
      position?: number;   // For multiplayer positioning
    }>;
    gameState?: {
      ball?: {
        x: number;
        y: number;
        velocityX: number;
        velocityY: number;
      };
      paddles?: Array<{
        playerId: string;
        x: number;
        y: number;
      }>;
      powerUps?: Array<{
        type: string;
        x: number;
        y: number;
      }>;
    };
    startedAt?: string;
    finishedAt?: string;
    winner?: string;
  };
}
```

---

### POST /api/game/:gameId/join

Join an existing game.

**Request Headers:**
```typescript
{
  Authorization: string;
}
```

**Path Parameters:**
```typescript
{
  gameId: string;
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    gameId: string;
    playerId: string;
    position: number;
    websocketUrl: string;
  };
}
```

---

### POST /api/game/:gameId/leave

Leave a game session.

**Response (200 OK):**
```typescript
{
  success: true;
  message: string;
}
```

---

### POST /api/game/:gameId/ready

Mark player as ready.

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    allReady: boolean;     // True if all players ready
    countdown?: number;    // Seconds until start
  };
}
```

---

### GET /api/game/active

List active games (for matchmaking).

**Query Parameters:**
```typescript
{
  gameType?: "pong" | "other";
  mode?: "1v1" | "multiplayer";
  includePrivate?: boolean; // Default: false
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    games: Array<{
      gameId: string;
      gameType: string;
      mode: string;
      currentPlayers: number;
      maxPlayers: number;
      host: {
        userId: string;
        username: string;
      };
      isPrivate: boolean;
      createdAt: string;
    }>;
  };
}
```

---

### POST /api/game/matchmaking/queue

Join matchmaking queue.

**Request Body:**
```typescript
{
  gameType: "pong" | "other";
  mode: "1v1" | "multiplayer";
  skillRange?: {
    min: number;
    max: number;
  };
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    queueId: string;
    estimatedWait: number; // Seconds
    position: number;
  };
}
```

---

### DELETE /api/game/matchmaking/queue

Leave matchmaking queue.

**Response (200 OK):**
```typescript
{
  success: true;
  message: string;
}
```

---

### WebSocket /api/game/:gameId/ws

Real-time game communication.

**Client → Server Messages:**

```typescript
// Player input
{
  type: "input";
  action: "move_up" | "move_down" | "move_left" | "move_right" | "use_powerup";
  timestamp: number;
}

// Ping for latency measurement
{
  type: "ping";
  timestamp: number;
}

// Chat message
{
  type: "chat";
  message: string;
}
```

**Server → Client Messages:**

```typescript
// Game state update (sent every frame)
{
  type: "state_update";
  timestamp: number;
  gameState: {
    ball: {
      x: number;
      y: number;
      velocityX: number;
      velocityY: number;
    };
    paddles: Array<{
      playerId: string;
      x: number;
      y: number;
    }>;
    scores: Record<string, number>;
    powerUps?: Array<{
      id: string;
      type: string;
      x: number;
      y: number;
    }>;
  };
}

// Game event
{
  type: "game_event";
  event: "goal" | "powerup_collected" | "game_start" | "game_end" | "player_joined" | "player_left";
  data: any;
}

// Pong response
{
  type: "pong";
  timestamp: number;
  serverTime: number;
}
```

---

## Chat API

Base path: `/api/chat`

### POST /api/chat/direct

Send direct message to user.

**Request Headers:**
```typescript
{
  Authorization: string;
}
```

**Request Body:**
```typescript
{
  recipientId: string;
  message: string;         // Max 1000 characters
  replyTo?: string;        // Message ID being replied to
}
```

**Response (201 Created):**
```typescript
{
  success: true;
  data: {
    messageId: string;
    senderId: string;
    recipientId: string;
    message: string;
    timestamp: string;
    status: "sent" | "delivered" | "read";
  };
}
```

---

### GET /api/chat/conversations

Get list of conversations.

**Query Parameters:**
```typescript
{
  limit?: number;          // Default: 50
  offset?: number;
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    conversations: Array<{
      conversationId: string;
      participant: {
        userId: string;
        username: string;
        displayName: string;
        avatar?: string;
        onlineStatus: string;
      };
      lastMessage: {
        messageId: string;
        senderId: string;
        message: string;
        timestamp: string;
        isRead: boolean;
      };
      unreadCount: number;
    }>;
  };
}
```

---

### GET /api/chat/messages/:conversationId

Get message history for a conversation.

**Path Parameters:**
```typescript
{
  conversationId: string;
}
```

**Query Parameters:**
```typescript
{
  limit?: number;          // Default: 50
  before?: string;         // Message ID for pagination
  after?: string;
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    messages: Array<{
      messageId: string;
      senderId: string;
      recipientId: string;
      message: string;
      timestamp: string;
      status: "sent" | "delivered" | "read";
      replyTo?: {
        messageId: string;
        message: string;
        senderId: string;
      };
    }>;
    hasMore: boolean;
  };
}
```

---

### PUT /api/chat/messages/:messageId/read

Mark message as read.

**Response (200 OK):**
```typescript
{
  success: true;
  message: string;
}
```

---

### DELETE /api/chat/messages/:messageId

Delete a message.

**Response (200 OK):**
```typescript
{
  success: true;
  message: string;
}
```

---

### POST /api/chat/game-invite

Send game invitation via chat.

**Request Body:**
```typescript
{
  recipientId: string;
  gameType: "pong" | "other";
  gameId?: string;         // Existing game or null for new
}
```

**Response (200 OK):**
```typescript
{
  success: true;
  data: {
    inviteId: string;
    gameId: string;
    recipientId: string;
    expiresAt: string;
  };
}
```

---

### WebSocket /api/chat/ws

Real-time chat communication.

**Client → Server Messages:**

```typescript
// Send message
{
  type: "message";
  recipientId: string;
  message: string;
  replyTo?: string;
}

// Typing indicator
{
  type: "typing";
  conversationId: string;
  isTyping: boolean;
}

// Mark as read
{
  type: "read";
  messageId: string;
}
```

**Server → Client Messages:**

```typescript
// New message received
{
  type: "new_message";
  data: {
    messageId: string;
    conversationId: string;
    senderId: string;
    message: string;
    timestamp: string;
    replyTo?: any;
  };
}

// Typing indicator
{
  type: "user_typing";
  conversationId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}

// Message status update
{
  type: "message_status";
  messageId: string;
  status: "delivered" | "read";
}

// Game invite received
{
  type: "game_invite";
  data: {
    inviteId: string;
    senderId: string;
    senderUsername: string;
    gameType: string;
    gameId: string;
  };
}
```

---

## Common Response Patterns

### Error Response Structure

All error responses follow this structure:

```typescript
{
  success: false;
  error: {
    code: string;          // Machine-readable error code
    message: string;       // Human-readable error message
    field?: string;        // Field that caused validation error
    details?: any;         // Additional error context
  };
}
```

### Common HTTP Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `204 No Content` - Successful request with no response body
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Authenticated but not authorized
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., username taken)
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Pagination Pattern

Paginated endpoints use this query parameter structure:

```typescript
{
  limit?: number;          // Items per page (default: 50)
  offset?: number;         // Items to skip (default: 0)
  sortBy?: string;         // Field to sort by
  sortOrder?: "asc" | "desc"; // Sort direction
}
```

### WebSocket Connection Pattern

All WebSocket connections require authentication via query parameter:

```
ws://example.com/api/endpoint/ws?token=<jwt_token>
```

Or via initial authentication message after connection.

---

## Notes