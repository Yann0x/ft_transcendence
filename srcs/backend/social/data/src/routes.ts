import { FastifyInstance } from 'fastify';
import * as handlers from './social_methods';

export function socialRoutes(server: FastifyInstance) {
  // WebSocket endpoint for real-time social features
  server.get('/social/wss', { websocket: true }, handlers.socialWss);

  // REST endpoint for user update notifications
  server.post('/social/notify/user_update', handlers.notifyUserUpdate);

  // REST endpoint for new message notifications
  server.post('/social/notify/message_new', handlers.notifyMessageNew);

  // REST endpoint for channel update notifications
  server.post('/social/notify/channel_update', handlers.notifyChannelUpdate);
}
