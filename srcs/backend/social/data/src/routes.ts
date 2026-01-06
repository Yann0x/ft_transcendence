import { FastifyInstance } from 'fastify';
import * as handlers from './social_methods';

export function socialRoutes(server: FastifyInstance) {
  // WebSocket endpoint for real-time social features
  server.get('/social/wss', { websocket: true }, handlers.socialWss);

  // REST endpoints for friend management
}
