import { FastifyRequest, FastifyReply } from 'fastify';
import { WebSocket } from '@fastify/websocket';
import { SocialEvent, User } from './shared/with_front/types';
import customFetch from './shared/utils/fetch';
import {ConnexionManager} from './connexion_manager'

const manager = ConnexionManager.getInstance();

export async function socialWss(socket: WebSocket, req: FastifyRequest) {
  console.log(`[SOCIAL] socialWss called for user headers:`, req.headers);
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

  // Get list of already connected users BEFORE adding this user
  const alreadyConnectedUsers = manager.getAllConnectedUsers();

  // Add this user to connected users
  manager.addConnected(user, socket)

  // Send list of already online users to the new user (full UserPublic objects)
  if (alreadyConnectedUsers.length > 0) {
    console.log(`[SOCIAL] Sending ${alreadyConnectedUsers.length} already online users to ${user.id}`);
    socket.send(JSON.stringify({
      type: 'users_online',
      data: { users: alreadyConnectedUsers },
      timestamp: new Date().toISOString()
    } as SocialEvent));
  }

  // Notify all OTHER users that this user came online (send full user object)
  const newConnexionEvent: SocialEvent = {
    type: 'user_online',
    data: { user: user },
    timestamp: new Date().toISOString()
  }
  manager.sendToAll(newConnexionEvent);

  // Send connected confirmation to this user
  socket.send(JSON.stringify({
    type: 'connected',
    timestamp: new Date().toISOString()
  } as SocialEvent));

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
    manager.sendToAll(disconnectEvent);
    if (user.id) manager.removeConnected(user.id);
  });

  socket.on('error', (error: Error) => {
    console.error('[SOCIAL] WebSocket error:', error);
    if (user.id) manager.removeConnected(user.id);
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
    manager.sendToUser(userId, event);
  });

  return reply.status(200).send({ success: true });
}