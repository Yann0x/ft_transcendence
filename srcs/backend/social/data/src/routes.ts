/* ROUTES */

import { FastifyInstance } from 'fastify';
import * as handlers from './social_methods';

/* Enregistre les routes du service social */
export function socialRoutes(server: FastifyInstance) {
  server.get('/social/wss', { websocket: true }, handlers.socialWss);
  server.post('/social/notify/user_update', handlers.notifyUserUpdate);
  server.post('/social/notify/message_new', handlers.notifyMessageNew);
  server.post('/social/notify/channel_update', handlers.notifyChannelUpdate);
  server.post('/social/notify/friend_add', handlers.notifyFriendAdd);
  server.post('/social/notify/friend_remove', handlers.notifyFriendRemove);
  server.post('/social/game-invitation/complete', handlers.notifyGameInvitationComplete);
  server.post('/social/tournament/update', handlers.notifyTournamentUpdate);
}
