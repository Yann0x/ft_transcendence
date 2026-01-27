/* SOCIAL METHODS */

import { FastifyRequest, FastifyReply } from 'fastify';
import { WebSocket } from '@fastify/websocket';
import { SocialEvent, User } from './shared/with_front/types';
import customFetch from './shared/utils/fetch';
import { connexionManager } from './connexion_manager';
import * as commandHandlers from './command_handlers.js';

/* WEBSOCKET */

/* Gère la connexion WebSocket */
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
  await connexionManager.sendToAll(newConnexionEvent, user.id);
  setSocketListeners(user, socket);
}

/* Configure les listeners du socket */
function setSocketListeners(user: User, socket: WebSocket) {
  socket.on('message', async (rawMessage: Buffer) => {
    try {
      const message = rawMessage.toString();
      const event = JSON.parse(message) as SocialEvent;
      console.log(`[SOCIAL] Received event from user ${user.id}:`, event.type);

      switch (event.type) {
        case 'add_friend':
          await commandHandlers.handleAddFriend(user, socket, event.data);
          break;
        case 'remove_friend':
          await commandHandlers.handleRemoveFriend(user, socket, event.data);
          break;
        case 'send_message':
          await commandHandlers.handleSendMessage(user, socket, event.data);
          break;
        case 'block_user':
          await commandHandlers.handleBlockUser(user, socket, event.data);
          break;
        case 'unblock_user':
          await commandHandlers.handleUnblockUser(user, socket, event.data);
          break;
        case 'mark_read':
          await commandHandlers.handleMarkRead(user, socket, event.data);
          break;
        case 'game_invitation_send':
          await commandHandlers.handleSendGameInvitation(user, socket, event.data);
          break;
        case 'game_invitation_accept':
          await commandHandlers.handleAcceptGameInvitation(user, socket, event.data);
          break;
        case 'game_invitation_decline':
          await commandHandlers.handleDeclineGameInvitation(user, socket, event.data);
          break;
        case 'tournament_invitation_send':
          await commandHandlers.handleSendTournamentInvitation(user, socket, event.data);
          break;
        case 'tournament_invitation_accept':
          await commandHandlers.handleAcceptTournamentInvitation(user, socket, event.data);
          break;
        case 'tournament_invitation_decline':
          await commandHandlers.handleDeclineTournamentInvitation(user, socket, event.data);
          break;
        default:
          console.log(`[SOCIAL] Unknown event type: ${event.type}`);
          socket.send(JSON.stringify({
            type: 'error',
            data: { reason: `Unknown command: ${event.type}` },
            timestamp: new Date().toISOString()
          } as SocialEvent));
      }
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
    await connexionManager.sendToAll(disconnectEvent, user.id);
    connexionManager.removeConnected(user.id);
  });

  socket.on('error', (error: Error) => {
    console.error('[SOCIAL] WebSocket error:', error);
    connexionManager.removeConnected(user.id);
  });
}

/* NOTIFY HANDLERS */

/* Notifie une mise à jour utilisateur */
export async function notifyUserUpdate(request: FastifyRequest, reply: FastifyReply) {
  const { notifyUserIds, updatedUserId } = request.body as {
    notifyUserIds: string | string[];
    updatedUserId: string
  };

  if (!updatedUserId) {
    return reply.status(400).send({ success: false, message: 'updatedUserId required' });
  }

  const userIdsArray = Array.isArray(notifyUserIds) ? notifyUserIds : [notifyUserIds];

  if (!userIdsArray || userIdsArray.length === 0) {
    return reply.status(400).send({ success: false, message: 'notifyUserIds required' });
  }

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

/* Notifie un nouveau message */
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

/* Notifie une mise à jour de canal */
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

/* Notifie un ajout d'ami */
export async function notifyFriendAdd(request: FastifyRequest, reply: FastifyReply) {
  const { userIds, friend } = request.body as {
    userIds: string[];
    friend: any
  };

  if (!userIds || userIds.length === 0) {
    return reply.status(400).send({ success: false, message: 'userIds required' });
  }

  if (!friend) {
    return reply.status(400).send({ success: false, message: 'friend required' });
  }

  console.log(`[SOCIAL] Sending friend_add event to ${userIds.length} users for friend ${friend.id}`);

  userIds.forEach(userId => {
    const event: SocialEvent = {
      type: 'friend_add',
      data: { friend },
      timestamp: new Date().toISOString()
    };
    connexionManager.sendToUser(userId, event);
  });

  return reply.status(200).send({ success: true });
}

/* Notifie une suppression d'ami */
export async function notifyFriendRemove(request: FastifyRequest, reply: FastifyReply) {
  const { userIds, friendId } = request.body as {
    userIds: string[];
    friendId: string
  };

  if (!userIds || userIds.length === 0) {
    return reply.status(400).send({ success: false, message: 'userIds required' });
  }

  if (!friendId) {
    return reply.status(400).send({ success: false, message: 'friendId required' });
  }

  console.log(`[SOCIAL] Sending friend_remove event to ${userIds.length} users for friendId ${friendId}`);

  userIds.forEach(userId => {
    const event: SocialEvent = {
      type: 'friend_remove',
      data: { friendId },
      timestamp: new Date().toISOString()
    };
    connexionManager.sendToUser(userId, event);
  });

  return reply.status(200).send({ success: true });
}

/* Notifie la fin d'une invitation de jeu */
export async function notifyGameInvitationComplete(request: FastifyRequest, reply: FastifyReply) {
  const { invitationId, winnerId, loserId, score1, score2 } = request.body as {
    invitationId: string;
    winnerId: string;
    loserId: string;
    score1: number;
    score2: number;
  };

  if (!invitationId || !winnerId || !loserId || score1 === undefined || score2 === undefined) {
    return reply.status(400).send({ success: false, message: 'Missing required fields' });
  }

  console.log(`[SOCIAL] Game invitation ${invitationId} completed: ${winnerId} defeated ${loserId} ${score1}-${score2}`);

  try {
    const invitation = connexionManager.getInvitation(invitationId);
    if (!invitation) {
      return reply.status(404).send({ success: false, message: 'Invitation not found' });
    }

    const winnerUsers = await customFetch('http://database:3000/database/user', 'GET', { id: winnerId }) as any[];
    const winnerUser = winnerUsers && winnerUsers.length > 0 ? winnerUsers[0] : null;
    const winnerName = winnerUser?.name || 'Player';

    const loserUsers = await customFetch('http://database:3000/database/user', 'GET', { id: loserId }) as any[];
    const loserUser = loserUsers && loserUsers.length > 0 ? loserUsers[0] : null;
    const loserName = loserUser?.name || 'Player';

    const resultMetadata = {
      invitationId,
      winnerId,
      loserId,
      score1,
      score2,
      completedAt: new Date().toISOString()
    };

    await customFetch('http://database:3000/database/message', 'PUT', {
      id: invitation.messageId,
      type: 'game_result',
      content: `${winnerName} defeated ${loserName}!`,
      metadata: JSON.stringify(resultMetadata)
    });

    const channels = await customFetch('http://database:3000/database/channel', 'GET',
      { id: invitation.channelId }) as any;
    const channel = Array.isArray(channels) ? channels[0] : channels;

    if (channel && channel.members) {
      const resultEvent: SocialEvent = {
        type: 'game_result_update',
        data: { invitationId, winnerId, winnerName, loserId, loserName, score1, score2 },
        timestamp: new Date().toISOString()
      };

      channel.members.forEach((memberId: string) => {
        connexionManager.sendToUser(memberId, resultEvent);
      });
    }

    if (invitation.expirationTimer) {
      clearTimeout(invitation.expirationTimer);
    }
    connexionManager.invitations.delete(invitationId);

    return reply.status(200).send({ success: true });
  } catch (error) {
    console.error('[SOCIAL] Error processing game invitation complete:', error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
}

/* Notifie une mise à jour de tournoi */
export async function notifyTournamentUpdate(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { tournamentId, status, currentMatch, winner, players } = req.body as {
      tournamentId: string;
      status: 'waiting' | 'in_progress' | 'finished';
      currentMatch?: {
        matchId: string;
        player1Id: string;
        player1Name: string;
        player2Id: string;
        player2Name: string;
        status: string;
      };
      winner?: {
        odId: string;
        odAlias: string;
        odUserId?: string;
      };
      players: Array<{
        odId: string;
        odAlias: string;
        odUserId?: string;
      }>;
    };

    console.log(`[SOCIAL] Tournament update received: ${tournamentId}, status: ${status}`);

    const invitationsToUpdate: Array<{
      invitationId: string;
      invitedId: string;
      inviterId: string;
      channelId: string;
      messageId?: number;
      tournamentName?: string;
    }> = [];

    for (const [invitationId, invitation] of connexionManager.tournamentInvitations) {
      if (invitation.tournamentId === tournamentId && invitation.status === 'accepted') {
        invitationsToUpdate.push({
          invitationId,
          invitedId: invitation.invitedId,
          inviterId: invitation.inviterId,
          channelId: invitation.channelId,
          messageId: invitation.messageId,
          tournamentName: invitation.tournamentName
        });
      }
    }

    if (invitationsToUpdate.length === 0) {
      console.log(`[SOCIAL] No accepted invitations found for tournament ${tournamentId}`);
      return reply.status(200).send({ success: true, updated: 0 });
    }

    for (const inv of invitationsToUpdate) {
      const invitedPlayer = players.find(p => p.odUserId === inv.invitedId);

      let matchReady = false;
      let matchId: string | undefined;
      let opponentName: string | undefined;

      if (currentMatch && currentMatch.status === 'ready') {
        if (invitedPlayer && (currentMatch.player1Id === invitedPlayer.odId || currentMatch.player2Id === invitedPlayer.odId)) {
          matchReady = true;
          matchId = currentMatch.matchId;
          opponentName = currentMatch.player1Id === invitedPlayer.odId
            ? currentMatch.player2Name
            : currentMatch.player1Name;
        }
      }

      const updatedMetadata = {
        invitationId: inv.invitationId,
        tournamentId,
        tournamentName: inv.tournamentName,
        inviterId: inv.inviterId,
        invitedId: inv.invitedId,
        status: 'accepted',
        tournamentStatus: status,
        matchReady,
        matchId,
        opponentName,
        winnerName: winner?.odAlias,
        winnerId: winner?.odUserId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      };

      if (inv.messageId) {
        try {
          await customFetch('http://database:3000/database/message', 'PUT', {
            id: inv.messageId,
            metadata: JSON.stringify(updatedMetadata)
          });
        } catch (err) {
          console.error(`[SOCIAL] Failed to update message ${inv.messageId}:`, err);
        }
      }

      try {
        const channel = await customFetch('http://database:3000/database/channel', 'GET',
          { id: inv.channelId }) as any;

        if (channel && channel.members) {
          const updateEvent: SocialEvent = {
            type: 'tournament_card_update',
            data: {
              invitationId: inv.invitationId,
              tournamentId,
              ...updatedMetadata
            },
            timestamp: new Date().toISOString()
          };

          channel.members.forEach((memberId: string) => {
            connexionManager.sendToUser(memberId, updateEvent);
          });
        }
      } catch (err) {
        console.error(`[SOCIAL] Failed to broadcast tournament update for channel ${inv.channelId}:`, err);
      }
    }

    console.log(`[SOCIAL] Updated ${invitationsToUpdate.length} tournament invitations`);
    return reply.status(200).send({ success: true, updated: invitationsToUpdate.length });
  } catch (error) {
    console.error('[SOCIAL] Error processing tournament update:', error);
    return reply.status(500).send({ success: false, message: 'Internal server error' });
  }
}
