import { FastifyRequest, FastifyReply } from 'fastify';
import { WebSocket } from '@fastify/websocket';
import { SocialEvent, User } from './shared/with_front/types';
import customFetch from './shared/utils/fetch';
import {connexionManager} from './connexion_manager'


export async function socialWss(socket: WebSocket, req: FastifyRequest) {
  if (!socket) return;
  const user = {
    id: req.headers['x-sender-id'] as string | undefined,
    name: req.headers['x-sender-name'] as string | undefined,
    avatar: req.headers['x-sender-avatar'] as string | undefined,
    status: 'online' as const
  }
  console.log(`[SOCIAL] New WebSocket connection for user ${user.id} (${user.name})`);
  if (!user.id) {
    console.error('[SOCIAL] No user ID in headers, closing connection');
    socket.close();
    return;
  }

  socket.send(JSON.stringify({
    type: 'connected',
    timestamp: new Date().toISOString()
  } as SocialEvent));

  connexionManager.addConnected(user, socket)

  const alreadyConnectedUsers = connexionManager.getAllConnectedUsers();
  
  if (alreadyConnectedUsers.length > 0) {
    console.log(`[SOCIAL] Sending ${alreadyConnectedUsers.length} already online users to ${user.id}`);
    const usersOnlineEvent: SocialEvent = {
      type: 'users_online',
      data: { users: alreadyConnectedUsers },
      timestamp: new Date().toISOString()
    }
    socket.send(JSON.stringify(usersOnlineEvent));
  }

  const newConnexionEvent: SocialEvent = {
    type: 'user_online',
    data: { user: user },
    timestamp: new Date().toISOString()
  }
  connexionManager.sendToAll(newConnexionEvent);
  setSocketListeners(user, socket);
}

function setSocketListeners(user: User, socket: WebSocket){
  socket.on('message', async (rawMessage: Buffer) => {
    try {
      const message = rawMessage.toString();
      const event = JSON.parse(message) as SocialEvent;
      console.log(`[SOCIAL] Received event from user ${user.id}:`, event.type);
    } catch (error) {
      console.error('[SOCIAL] Error processing message:', error);
      socket.send(JSON.stringify({
        type: 'error',
        data: { reason: 'Invalid message format' },
        timestamp: new Date().toISOString()
      } as SocialEvent));
    }
  });

  socket.on('close', async () => {
    console.log('[SOCIAL] WebSocket connection closed');
    const disconnectEvent: SocialEvent = {
      type: 'user_offline',
      data: { id: user.id },
      timestamp: new Date().toISOString()
    }
    connexionManager.sendToAll(disconnectEvent);
    connexionManager.removeConnected(user.id);
  });

  socket.on('error', (error: Error) => {
    console.error('[SOCIAL] WebSocket error:', error);
    connexionManager.removeConnected(user.id);
  });
  
}

export async function notifyUserUpdate(request: FastifyRequest, reply: FastifyReply) {
  const { notifyUserIds, updatedUserId } = request.body as {
    notifyUserIds: string | string[];
    updatedUserId: string
  };

  if (!updatedUserId) {
    return reply.status(400).send({ success: false, message: 'updatedUserId required' });
  }

  // Convert single ID to array for uniform handling
  const userIdsArray = Array.isArray(notifyUserIds) ? notifyUserIds : [notifyUserIds];

  if (!userIdsArray || userIdsArray.length === 0) {
    return reply.status(400).send({ success: false, message: 'notifyUserIds required' });
  }

  // Send user_update event to each user in the notify list
  userIdsArray.forEach(userId => {
    const event: SocialEvent = {
      type: 'user_update',
      data: { userId: updatedUserId },
      timestamp: new Date().toISOString()
    };
    connexionManager.sendToUser(userId, event);
  });

  return reply.status(200).send({ success: true });
}

export async function notifyMessageNew(request: FastifyRequest, reply: FastifyReply) {
  const { userIds, message } = request.body as {
    userIds: string[];
    message: any
  };

  if (!userIds || userIds.length === 0) {
    return reply.status(400).send({ success: false, message: 'userIds required' });
  }

  if (!message) {
    return reply.status(400).send({ success: false, message: 'message required' });
  }

  // Send message_new event to each user in the channel
  userIds.forEach(userId => {
    const event: SocialEvent = {
      type: 'message_new',
      data: message,
      timestamp: new Date().toISOString()
    };
    connexionManager.sendToUser(userId, event);
  });

  return reply.status(200).send({ success: true });
}

export async function notifyChannelUpdate(request: FastifyRequest, reply: FastifyReply) {
  const { userIds, channel } = request.body as {
    userIds: string[];
    channel: any
  };

  if (!userIds || userIds.length === 0) {
    return reply.status(400).send({ success: false, message: 'userIds required' });
  }

  if (!channel) {
    return reply.status(400).send({ success: false, message: 'channel required' });
  }

  console.log(`[SOCIAL] Sending channel_update event to ${userIds.length} users for channel ${channel.id}`);

  // Send channel_update event to each user in the channel
  userIds.forEach(userId => {
    const event: SocialEvent = {
      type: 'channel_update',
      data: channel,
      timestamp: new Date().toISOString()
    };
    connexionManager.sendToUser(userId, event);
  });

  return reply.status(200).send({ success: true });
}