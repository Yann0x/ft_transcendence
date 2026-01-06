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
    email: req.headers['x-sender-email'] as string | undefined,
    status:  'online'
  }
  console.log(`[SOCIAL] New WebSocket connection for user ${user.id} (${user.name})`);

  if (!user.id) {
    console.error('[SOCIAL] No user ID in headers, closing connection');
    socket.close();
    return;
  }

  // Get list of already connected user IDs BEFORE adding this user
  const alreadyConnectedUserIds = manager.getAllConnectedUserIds();

  // Add this user to connected users
  manager.addConnected(user.id, socket)

  // Send list of already online users to the new user (just IDs)
  if (alreadyConnectedUserIds.length > 0) {
    console.log(`[SOCIAL] Sending ${alreadyConnectedUserIds.length} already online user IDs to ${user.id}`);
    socket.send(JSON.stringify({
      type: 'users_online',
      data: { userIds: alreadyConnectedUserIds },
      timestamp: new Date().toISOString()
    } as SocialEvent));
  }

  // Notify all OTHER users that this user came online
  const newConnexionEvent: SocialEvent = {
    type: 'user_online',
    data: { id: user.id },
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