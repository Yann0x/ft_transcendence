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

  // REST endpoint for friend add notifications
  server.post('/social/notify/friend_add', handlers.notifyFriendAdd);

  // REST endpoint for friend remove notifications
  server.post('/social/notify/friend_remove', handlers.notifyFriendRemove);

  // REST endpoint for game invitation completion (called by game service)
  server.post('/social/game-invitation/complete', handlers.notifyGameInvitationComplete);

  // REST endpoint for tournament updates (called by tournament service)
  server.post('/social/tournament/update', handlers.notifyTournamentUpdate);
}
