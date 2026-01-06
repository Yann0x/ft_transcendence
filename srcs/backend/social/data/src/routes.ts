import { FastifyInstance } from 'fastify';
import * as handlers from './social_methods';

export function socialRoutes(server: FastifyInstance) {
  // WebSocket endpoint for real-time social features
  server.get('/social/wss', { websocket: true }, handlers.socialWss);

  // REST endpoint for user update notifications
  server.post('/social/notify/user_update', handlers.notifyUserUpdate);
}
