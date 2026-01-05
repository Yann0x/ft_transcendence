import { FastifyRequest, FastifyReply } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { SocialEvent, User } from './shared/with_front/types';
import customFetch from './shared/utils/fetch';
import {UserManager} from './connexion_manager'

const manager = UserManager.getInstance();

export async function socialWss(connection: SocketStream, req: FastifyRequest) {
  if (!connection || !connection.socket) return;
  
  console.log(`[SOCIAL] New WebSocket connection for user ${userId} (${userName})`);

  const user = {
    id: req.headers['x-sender-id'] as string | undefined,
    name: req.headers['x-sender-name'] as string | undefined,
    email: req.headers['x-sender-email'] as string | undefined
  }
  
  // TODO add connection to manager immediately
  
  manager.addConnected(user)

  connection.socket.send(JSON.stringify({
    type: 'connected',
    timestamp: new Date().toISOString()
  } as SocialEvent));

  connection.socket.on('message', async (rawMessage: Buffer) => {
    try {
      const message = rawMessage.toString();
      const event = JSON.parse(message) as SocialEvent;

      // Handle different event types (future expansion)
      console.log(`[SOCIAL] Received event from user ${user}:`, event.type);

    } catch (error) {
      console.error('[SOCIAL] Error processing message:', error);
      connection.socket.send(JSON.stringify({
        type: 'error',
        data: { reason: 'Invalid message format' },
        timestamp: new Date().toISOString()
      } as SocialEvent));
    }
  });

  connection.socket.on('close', async () => {
    console.log('[SOCIAL] WebSocket connection closed');
    manager.removeConnected(user)
  });

  connection.socket.on('error', (error) => {
    console.error('[SOCIAL] WebSocket error:', error);
    manager.removeConnected(user)
  });
}

async function notifyFriendsUserOnline(userId: string): Promise<void> {
  try {
    // Get user's friends from database
    const friends = await customFetch(
      'http://database:3000/database/friends',
      'GET',
      { user_id: userId }
    ) as Array<{ id: string; status: string }>;

    // Only notify accepted friends
    const acceptedFriendIds = friends
      .filter(f => f.status === 'accepted')
      .map(f => f.id);

    // Get user info for the event
    const users = await customFetch(
      'http://database:3000/database/user',
      'GET',
      { id: userId }
    ) as Array<{ id: string; name: string; avatar?: string }>;

    if (users.length === 0) return;

    const user = users[0];

    const event: SocialEvent = {
      type: 'user_online',
      data: {
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar
      },
      timestamp: new Date().toISOString()
    };

    // Broadcast to online friends only
    connectionManager.sendToUsers(acceptedFriendIds, event);

    console.log(`[SOCIAL] Notified ${acceptedFriendIds.length} friends that user ${userId} is online`);
  } catch (error) {
    console.error('[SOCIAL] Error notifying friends user online:', error);
  }
}

async function notifyFriendsUserOffline(userId: string): Promise<void> {
  try {
    // Get user's friends from database
    const friends = await customFetch(
      'http://database:3000/database/friends',
      'GET',
      { user_id: userId }
    ) as Array<{ id: string; status: string }>;

    // Only notify accepted friends
    const acceptedFriendIds = friends
      .filter(f => f.status === 'accepted')
      .map(f => f.id);

    const event: SocialEvent = {
      type: 'user_offline',
      data: { userId },
      timestamp: new Date().toISOString()
    };

    // Broadcast to online friends only
    connectionManager.sendToUsers(acceptedFriendIds, event);

    console.log(`[SOCIAL] Notified ${acceptedFriendIds.length} friends that user ${userId} is offline`);
  } catch (error) {
    console.error('[SOCIAL] Error notifying friends user offline:', error);
  }
}

/**
 * Send friend request (REST endpoint)
 */
export async function sendFriendRequestHandler(
  req: FastifyRequest<{ Body: { user_id: string; friend_id: string } }>,
  reply: FastifyReply
) {
  try {
    const { user_id, friend_id } = req.body;

    // Create friendship in database
    const result = await customFetch(
      'http://database:3000/database/friend',
      'PUT',
      { user_id, friend_id }
    ) as boolean;

    if (!result) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Friendship already exists or request already sent',
        statusCode: 400
      });
    }

    // Get user info to send in the event
    const users = await customFetch(
      'http://database:3000/database/user',
      'GET',
      { id: user_id }
    ) as Array<{ id: string; name: string; avatar?: string }>;

    if (users.length > 0) {
      const user = users[0];

      // Send real-time notification to friend
      const event: SocialEvent = {
        type: 'friend_request_REQUESTd',
        data: {
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar
        },
        timestamp: new Date().toISOString()
      };

      connectionManager.sendToUser(friend_id, event);
    }

    return {
      success: true,
      message: 'Friend request sent successfully'
    };

  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: error.error || 'Send Friend Request Failed',
      message: error.message,
      statusCode,
      service: 'social'
    });
  }
}

/**
 * Accept friend request (REST endpoint)
 */
export async function acceptFriendRequestHandler(
  req: FastifyRequest<{ Body: { user_id: string; friend_id: string } }>,
  reply: FastifyReply
) {
  try {
    const { user_id, friend_id } = req.body;

    // Accept friendship in database (PUT with user who is accepting will mark as accepted)
    const result = await customFetch(
      'http://database:3000/database/friend',
      'PUT',
      { user_id, friend_id }
    ) as boolean;

    if (!result) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Friendship not found or already accepted',
        statusCode: 400
      });
    }

    // Get user info
    const users = await customFetch(
      'http://database:3000/database/user',
      'GET',
      { id: user_id }
    ) as Array<{ id: string; name: string; avatar?: string }>;

    if (users.length > 0) {
      const user = users[0];

      // Notify the friend that request was accepted
      const event: SocialEvent = {
        type: 'friend_request_accepted',
        data: {
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar,
          isOnline: connectionManager.isUserOnline(user.id)
        },
        timestamp: new Date().toISOString()
      };

      connectionManager.sendToUser(friend_id, event);

      // Also notify the accepting user about the friend
      const friendUsers = await customFetch(
        'http://database:3000/database/user',
        'GET',
        { id: friend_id }
      ) as Array<{ id: string; name: string; avatar?: string }>;

      if (friendUsers.length > 0) {
        const friendUser = friendUsers[0];
        const acceptEvent: SocialEvent = {
          type: 'friend_request_accepted',
          data: {
            userId: friendUser.id,
            userName: friendUser.name,
            userAvatar: friendUser.avatar,
            isOnline: connectionManager.isUserOnline(friendUser.id)
          },
          timestamp: new Date().toISOString()
        };
        connectionManager.sendToUser(user_id, acceptEvent);
      }
    }

    return {
      success: true,
      message: 'Friend request accepted successfully'
    };

  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: error.error || 'Accept Friend Request Failed',
      message: error.message,
      statusCode,
      service: 'social'
    });
  }
}

/**
 * Remove friend (REST endpoint)
 */
export async function removeFriendHandler(
  req: FastifyRequest<{ Body: { user_id: string; friend_id: string } }>,
  reply: FastifyReply
) {
  try {
    const { user_id, friend_id } = req.body;

    // Remove friendship from database
    const result = await customFetch(
      'http://database:3000/database/friend',
      'DELETE',
      { user_id, friend_id }
    ) as boolean;

    if (!result) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Friendship not found',
        statusCode: 404
      });
    }

    // Notify both users
    const event: SocialEvent = {
      type: 'friend_removed',
      data: { userId: user_id },
      timestamp: new Date().toISOString()
    };

    connectionManager.sendToUser(friend_id, event);

    const reverseEvent: SocialEvent = {
      type: 'friend_removed',
      data: { userId: friend_id },
      timestamp: new Date().toISOString()
    };

    connectionManager.sendToUser(user_id, reverseEvent);

    return {
      success: true,
      message: 'Friend removed successfully'
    };

  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: error.error || 'Remove Friend Failed',
      message: error.message,
      statusCode,
      service: 'social'
    });
  }
}

/**
 * Get user's friends list with online status (REST endpoint)
 */
export async function getFriendsHandler(
  req: FastifyRequest<{ Querystring: { user_id: string } }>,
  reply: FastifyReply
) {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'user_id is required',
        statusCode: 400
      });
    }

    // Get friends from database
    const friends = await customFetch(
      'http://database:3000/database/friends',
      'GET',
      { user_id }
    ) as Array<any>;

    // Enrich with online status
    const enrichedFriends = friends.map(friend => ({
      ...friend,
      onlineStatus: connectionManager.isUserOnline(friend.id) ? 'online' : 'offline'
    }));

    return enrichedFriends;

  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: error.error || 'Get Friends Failed',
      message: error.message,
      statusCode,
      service: 'social'
    });
  }
}
