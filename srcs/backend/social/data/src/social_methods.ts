import { FastifyRequest, FastifyReply } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { SocialEvent, User } from './shared/with_front/types';
import customFetch from './shared/utils/fetch';
import {ConnexionManager} from './connexion_manager'

const manager = ConnexionManager.getInstance();

export async function socialWss(connection: SocketStream, req: FastifyRequest) {
  if (!connection || !connection.socket) return;
  
  console.log(`[SOCIAL] New WebSocket connection for user ${userId} (${userName})`);

  const user = {
    id: req.headers['x-sender-id'] as string | undefined,
    name: req.headers['x-sender-name'] as string | undefined,
    email: req.headers['x-sender-email'] as string | undefined
  }
  
  manager.addConnected(user)

  connection.socket.send(JSON.stringify({
    type: 'connected',
    timestamp: new Date().toISOString()
  } as SocialEvent));

  connection.socket.on('message', async (rawMessage: Buffer) => {
    try {
      const message = rawMessage.toString();
      const event = JSON.parse(message) as SocialEvent;
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