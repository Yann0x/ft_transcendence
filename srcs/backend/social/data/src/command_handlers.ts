/* COMMAND HANDLERS */

import { WebSocket } from '@fastify/websocket';
import {
  UserPublic,
  SocialEvent,
  AddFriendCommand,
  RemoveFriendCommand,
  SendMessageCommand,
  BlockUserCommand,
  UnblockUserCommand,
  MarkReadCommand,
  SendGameInvitationCommand,
  RespondGameInvitationCommand,
  SendTournamentInvitationCommand,
  RespondTournamentInvitationCommand,
  Channel,
  Message
} from './shared/with_front/types';
import customFetch from './shared/utils/fetch';
import { connexionManager } from './connexion_manager';
import { randomUUID } from 'crypto';

/* TYPES */

interface SocketUser {
  id: string;
  name?: string;
  avatar?: string;
}

/* HELPERS */

/* Envoie une erreur au client */
function sendError(socket: WebSocket, originalType: string, message: string, commandId?: string): void {
  const errorEvent: SocialEvent = {
    type: 'command_error',
    data: { commandId, originalType, success: false, message },
    timestamp: new Date().toISOString()
  };
  socket.send(JSON.stringify(errorEvent));
}

/* Envoie un succès au client */
function sendSuccess(socket: WebSocket, originalType: string, data?: any, commandId?: string): void {
  const successEvent: SocialEvent = {
    type: 'command_success',
    data: { commandId, originalType, success: true, data },
    timestamp: new Date().toISOString()
  };
  socket.send(JSON.stringify(successEvent));
}

/* Récupère les données publiques d'un utilisateur */
async function getUserPublic(userId: string): Promise<UserPublic | null> {
  try {
    const users = await customFetch('http://database:3000/database/user', 'GET', { id: userId }) as any[];
    if (users && users.length > 0) {
      const user = users[0];
      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        status: connexionManager.isUserConnected(userId) ? 'online' : 'offline'
      };
    }
    return null;
  } catch (error) {
    console.error('[COMMAND] Error fetching user:', error);
    return null;
  }
}

/* Vérifie si deux utilisateurs sont bloqués */
async function areUsersBlocked(userId1: string, userId2: string): Promise<boolean> {
  try {
    const user1Blocked = await customFetch('http://database:3000/database/blocked', 'GET', { user_id: userId1 }) as string[];
    if (user1Blocked && user1Blocked.includes(userId2)) return true;

    const user2Blocked = await customFetch('http://database:3000/database/blocked', 'GET', { user_id: userId2 }) as string[];
    if (user2Blocked && user2Blocked.includes(userId1)) return true;

    return false;
  } catch (error) {
    console.error('[COMMAND] Error checking blocked status:', error);
    return false;
  }
}

/* FRIEND HANDLERS */

/* Gère l'ajout d'ami */
export async function handleAddFriend(user: SocketUser, socket: WebSocket, data: AddFriendCommand): Promise<void> {
  const { friendId, commandId } = data;
  const userId = user.id;

  console.log(`[COMMAND] add_friend: ${userId} -> ${friendId}`);

  if (!friendId) {
    return sendError(socket, 'add_friend', 'friendId is required', commandId);
  }

  if (userId === friendId) {
    return sendError(socket, 'add_friend', 'Cannot add yourself as friend', commandId);
  }

  try {
    const friendUser = await getUserPublic(friendId);
    if (!friendUser) {
      return sendError(socket, 'add_friend', 'User not found', commandId);
    }

    const existingFriends = await customFetch('http://database:3000/database/friends', 'GET', { user_id: userId }) as any[];
    if (existingFriends && existingFriends.some((f: any) => f.id === friendId)) {
      return sendError(socket, 'add_friend', 'Already friends', commandId);
    }

    if (await areUsersBlocked(userId, friendId)) {
      return sendError(socket, 'add_friend', 'Cannot add blocked user as friend', commandId);
    }

    const success = await customFetch('http://database:3000/database/friends', 'POST', {
      user_id: userId,
      friend_id: friendId
    });

    if (!success) {
      return sendError(socket, 'add_friend', 'Failed to add friend', commandId);
    }

    let channelId = await customFetch('http://database:3000/database/channel/find-dm', 'GET', {
      user1_id: userId,
      user2_id: friendId
    }) as string | null;

    if (!channelId) {
      const newChannelId = randomUUID();
      const channelData = {
        id: newChannelId,
        name: null,
        type: 'private',
        created_by: userId,
        created_at: new Date().toISOString()
      };

      channelId = await customFetch('http://database:3000/database/channel', 'POST', channelData) as string;

      if (channelId) {
        await customFetch('http://database:3000/database/channel/member', 'POST', {
          channel_id: channelId,
          user_id: userId
        });
        await customFetch('http://database:3000/database/channel/member', 'POST', {
          channel_id: channelId,
          user_id: friendId
        });
        console.log(`[COMMAND] Created DM channel ${channelId} for ${userId} <-> ${friendId}`);
      }
    }

    const currentUserPublic = await getUserPublic(userId);
    if (!currentUserPublic) {
      return sendError(socket, 'add_friend', 'Failed to get user data', commandId);
    }

    const friendAddEventForUser: SocialEvent = {
      type: 'friend_add',
      data: { friend: friendUser },
      timestamp: new Date().toISOString()
    };
    connexionManager.sendToUser(userId, friendAddEventForUser);

    const friendAddEventForFriend: SocialEvent = {
      type: 'friend_add',
      data: { friend: currentUserPublic },
      timestamp: new Date().toISOString()
    };
    connexionManager.sendToUser(friendId, friendAddEventForFriend);

    if (channelId) {
      const channel = await customFetch('http://database:3000/database/channel', 'GET', { id: channelId }) as Channel;
      if (channel) {
        const channelUpdateEvent: SocialEvent = {
          type: 'channel_update',
          data: channel,
          timestamp: new Date().toISOString()
        };
        connexionManager.sendToUser(userId, channelUpdateEvent);
        connexionManager.sendToUser(friendId, channelUpdateEvent);
      }
    }

    console.log(`[COMMAND] Friend added: ${userId} <-> ${friendId}`);
    sendSuccess(socket, 'add_friend', { friendId }, commandId);

  } catch (error) {
    console.error('[COMMAND] handleAddFriend error:', error);
    sendError(socket, 'add_friend', 'Internal server error', commandId);
  }
}

/* Gère la suppression d'ami */
export async function handleRemoveFriend(user: SocketUser, socket: WebSocket, data: RemoveFriendCommand): Promise<void> {
  const { friendId, commandId } = data;
  const userId = user.id;

  console.log(`[COMMAND] remove_friend: ${userId} -> ${friendId}`);

  if (!friendId) {
    return sendError(socket, 'remove_friend', 'friendId is required', commandId);
  }

  try {
    const success = await customFetch('http://database:3000/database/friends', 'DELETE', {
      user_id: userId,
      friend_id: friendId
    });

    if (!success) {
      return sendError(socket, 'remove_friend', 'Failed to remove friend', commandId);
    }

    const friendRemoveEventForUser: SocialEvent = {
      type: 'friend_remove',
      data: { friendId },
      timestamp: new Date().toISOString()
    };
    connexionManager.sendToUser(userId, friendRemoveEventForUser);

    const friendRemoveEventForFriend: SocialEvent = {
      type: 'friend_remove',
      data: { friendId: userId },
      timestamp: new Date().toISOString()
    };
    connexionManager.sendToUser(friendId, friendRemoveEventForFriend);

    console.log(`[COMMAND] Friend removed: ${userId} <-> ${friendId}`);
    sendSuccess(socket, 'remove_friend', { friendId }, commandId);

  } catch (error) {
    console.error('[COMMAND] handleRemoveFriend error:', error);
    sendError(socket, 'remove_friend', 'Internal server error', commandId);
  }
}

/* MESSAGE HANDLER */

/* Gère l'envoi de message */
export async function handleSendMessage(user: SocketUser, socket: WebSocket, data: SendMessageCommand): Promise<void> {
  const { channelId, content, commandId } = data;
  const userId = user.id;

  console.log(`[COMMAND] send_message: ${userId} -> channel ${channelId}`);

  if (!channelId || !content) {
    return sendError(socket, 'send_message', 'channelId and content are required', commandId);
  }

  if (content.trim().length === 0) {
    return sendError(socket, 'send_message', 'Message content cannot be empty', commandId);
  }

  try {
    const channel = await customFetch('http://database:3000/database/channel', 'GET', { id: channelId }) as Channel;

    if (!channel) {
      return sendError(socket, 'send_message', 'Channel not found', commandId);
    }

    if (!channel.members.includes(userId)) {
      return sendError(socket, 'send_message', 'Not a member of this channel', commandId);
    }

    if (channel.type === 'private' && channel.members.length === 2) {
      const otherUserId = channel.members.find(id => id !== userId);
      if (otherUserId && await areUsersBlocked(userId, otherUserId)) {
        return sendError(socket, 'send_message', 'Cannot send message - conversation is blocked', commandId);
      }
    }

    let messageData = {
      channel_id: channelId,
      sender_id: userId,
      content: content.trim(),
      sent_at: new Date().toISOString(),
      read_at: null
    } as Message;

    const savedMessageId = await customFetch('http://database:3000/database/message', 'POST', messageData) as Message.id;

    if (!savedMessageId) {
      return sendError(socket, 'send_message', 'Failed to save message', commandId);
    }

    messageData.id = savedMessageId;
    const messageNewEvent: SocialEvent = {
      type: 'message_new',
      data: messageData,
      timestamp: new Date().toISOString()
    };

    channel.members.forEach((memberId: UserPublic.id) => {
      if (memberId !== userId) {
        connexionManager.sendToUser(memberId, messageNewEvent);
      }
    });

    console.log(`[COMMAND] Message sent to channel ${channelId}`);
    sendSuccess(socket, 'send_message', { message: messageData }, commandId);

  } catch (error) {
    console.error('[COMMAND] handleSendMessage error:', error);
    sendError(socket, 'send_message', 'Internal server error', commandId);
  }
}

/* BLOCK HANDLERS */

/* Gère le blocage d'utilisateur */
export async function handleBlockUser(user: SocketUser, socket: WebSocket, data: BlockUserCommand): Promise<void> {
  const { userId: blockedUserId, commandId } = data;
  const userId = user.id;

  console.log(`[COMMAND] block_user: ${userId} -> ${blockedUserId}`);

  if (!blockedUserId) {
    return sendError(socket, 'block_user', 'userId is required', commandId);
  }

  if (userId === blockedUserId) {
    return sendError(socket, 'block_user', 'Cannot block yourself', commandId);
  }

  try {
    const success = await customFetch('http://database:3000/database/blocked', 'POST', {
      user_id: userId,
      blocked_user_id: blockedUserId
    });

    if (!success) {
      return sendError(socket, 'block_user', 'Failed to block user', commandId);
    }

    try {
      await customFetch('http://database:3000/database/friends', 'DELETE', {
        user_id: userId,
        friend_id: blockedUserId
      });
    } catch {
    }

    const friendRemoveForUser: SocialEvent = {
      type: 'friend_remove',
      data: { friendId: blockedUserId },
      timestamp: new Date().toISOString()
    };
    connexionManager.sendToUser(userId, friendRemoveForUser);

    const friendRemoveForBlocked: SocialEvent = {
      type: 'friend_remove',
      data: { friendId: userId },
      timestamp: new Date().toISOString()
    };
    connexionManager.sendToUser(blockedUserId, friendRemoveForBlocked);

    const channelId = await customFetch('http://database:3000/database/channel/find-dm', 'GET', {
      user1_id: userId,
      user2_id: blockedUserId
    }) as string | null;

    if (channelId) {
      const channel = await customFetch('http://database:3000/database/channel', 'GET', { id: channelId }) as Channel;
      if (channel) {
        const channelWithBlocked = { ...channel, isBlocked: true };
        const channelUpdateEvent: SocialEvent = {
          type: 'channel_update',
          data: channelWithBlocked,
          timestamp: new Date().toISOString()
        };
        connexionManager.sendToUser(userId, channelUpdateEvent);
        connexionManager.sendToUser(blockedUserId, channelUpdateEvent);
      }
    }

    console.log(`[COMMAND] User blocked: ${userId} blocked ${blockedUserId}`);
    sendSuccess(socket, 'block_user', { blockedUserId }, commandId);

  } catch (error) {
    console.error('[COMMAND] handleBlockUser error:', error);
    sendError(socket, 'block_user', 'Internal server error', commandId);
  }
}

/* Gère le déblocage d'utilisateur */
export async function handleUnblockUser(user: SocketUser, socket: WebSocket, data: UnblockUserCommand): Promise<void> {
  const { userId: unblockedUserId, commandId } = data;
  const userId = user.id;

  console.log(`[COMMAND] unblock_user: ${userId} -> ${unblockedUserId}`);

  if (!unblockedUserId) {
    return sendError(socket, 'unblock_user', 'userId is required', commandId);
  }

  try {
    const success = await customFetch('http://database:3000/database/blocked', 'DELETE', {
      user_id: userId,
      blocked_user_id: unblockedUserId
    });

    if (!success) {
      return sendError(socket, 'unblock_user', 'Failed to unblock user', commandId);
    }

    const channelId = await customFetch('http://database:3000/database/channel/find-dm', 'GET', {
      user1_id: userId,
      user2_id: unblockedUserId
    }) as string | null;

    if (channelId) {
      const otherUserBlocked = await customFetch('http://database:3000/database/blocked', 'GET', { user_id: unblockedUserId }) as string[];
      const stillBlocked = otherUserBlocked && otherUserBlocked.includes(userId);

      const channel = await customFetch('http://database:3000/database/channel', 'GET', { id: channelId }) as Channel;
      if (channel) {
        const channelWithBlocked = { ...channel, isBlocked: stillBlocked };
        const channelUpdateEvent: SocialEvent = {
          type: 'channel_update',
          data: channelWithBlocked,
          timestamp: new Date().toISOString()
        };
        connexionManager.sendToUser(userId, channelUpdateEvent);
        connexionManager.sendToUser(unblockedUserId, channelUpdateEvent);
      }
    }

    console.log(`[COMMAND] User unblocked: ${userId} unblocked ${unblockedUserId}`);
    sendSuccess(socket, 'unblock_user', { unblockedUserId }, commandId);

  } catch (error) {
    console.error('[COMMAND] handleUnblockUser error:', error);
    sendError(socket, 'unblock_user', 'Internal server error', commandId);
  }
}

/* MARK READ HANDLER */

/* Gère le marquage comme lu */
export async function handleMarkRead(user: SocketUser, socket: WebSocket, data: MarkReadCommand): Promise<void> {
  const { channelId, commandId } = data;
  const userId = user.id;

  console.log(`[COMMAND] mark_read: ${userId} -> channel ${channelId}`);

  if (!channelId) {
    return sendError(socket, 'mark_read', 'channelId is required', commandId);
  }

  try {
    const channel = await customFetch('http://database:3000/database/channel', 'GET', { id: channelId }) as Channel;

    if (!channel) {
      return sendError(socket, 'mark_read', 'Channel not found', commandId);
    }

    if (!channel.members.includes(userId)) {
      return sendError(socket, 'mark_read', 'Not a member of this channel', commandId);
    }

    const success = await customFetch('http://database:3000/database/channel/mark-read', 'PUT', {
      channel_id: channelId,
      user_id: userId
    });

    if (!success) {
      return sendError(socket, 'mark_read', 'Failed to mark as read', commandId);
    }

    const updatedChannel = await customFetch('http://database:3000/database/channel', 'GET', { id: channelId }) as Channel;
    if (updatedChannel) {
      const channelUpdateEvent: SocialEvent = {
        type: 'channel_update',
        data: updatedChannel,
        timestamp: new Date().toISOString()
      };
      channel.members.forEach(memberId => {
        connexionManager.sendToUser(memberId, channelUpdateEvent);
      });
    }

    console.log(`[COMMAND] Channel ${channelId} marked as read by ${userId}`);
    sendSuccess(socket, 'mark_read', { channelId }, commandId);

  } catch (error) {
    console.error('[COMMAND] handleMarkRead error:', error);
    sendError(socket, 'mark_read', 'Internal server error', commandId);
  }
}

/* GAME INVITATION HANDLERS */

/* Gère l'envoi d'invitation de jeu */
export async function handleSendGameInvitation(
  user: SocketUser,
  socket: WebSocket,
  data: SendGameInvitationCommand
): Promise<void> {
  const { channelId, invitedUserId, commandId } = data;
  const inviterId = user.id;

  console.log(`[COMMAND] game_invitation_send: ${inviterId} -> ${invitedUserId}`);

  if (inviterId === invitedUserId) {
    return sendError(socket, 'game_invitation_send', 'Cannot invite yourself', commandId);
  }

  if (!channelId || !invitedUserId) {
    return sendError(socket, 'game_invitation_send', 'channelId and invitedUserId are required', commandId);
  }

  try {
    const friends = await customFetch('http://database:3000/database/friends', 'GET',
      { user_id: inviterId }) as any[];
    if (!friends || !friends.some((f: any) => f.id === invitedUserId)) {
      return sendError(socket, 'game_invitation_send', 'Can only invite friends', commandId);
    }

    if (await areUsersBlocked(inviterId, invitedUserId)) {
      return sendError(socket, 'game_invitation_send', 'Cannot invite blocked user', commandId);
    }

    if (connexionManager.hasActiveInvitationInChannel(channelId)) {
      return sendError(socket, 'game_invitation_send', 'Invitation already pending in this channel', commandId);
    }

    const invitationId = randomUUID();
    const inviterUser = await getUserPublic(inviterId);
    const messageContent = `${inviterUser?.name || 'Someone'} challenges you to a duel!`;

    const invitationMetadata = {
      invitationId,
      inviterId,
      invitedId: invitedUserId,
      status: 'pending',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };

    const messageData = {
      channel_id: channelId,
      sender_id: inviterId,
      content: messageContent,
      type: 'game_invitation',
      metadata: JSON.stringify(invitationMetadata),
      sent_at: new Date().toISOString(),
      read_at: null
    };

    const messageId = await customFetch('http://database:3000/database/message', 'POST',
      messageData) as number;

    if (!messageId) {
      return sendError(socket, 'game_invitation_send', 'Failed to create invitation message', commandId);
    }

    connexionManager.createInvitation(invitationId, inviterId, invitedUserId,
      channelId, messageId);

    await customFetch('http://database:3000/database/game_invitation', 'POST', {
      id: invitationId,
      channel_id: channelId,
      message_id: messageId,
      inviter_id: inviterId,
      invited_id: invitedUserId,
      status: 'pending',
      expires_at: invitationMetadata.expiresAt,
      created_at: invitationMetadata.createdAt
    });

    const channel = await customFetch('http://database:3000/database/channel', 'GET',
      { id: channelId }) as Channel;

    if (!channel) {
      return sendError(socket, 'game_invitation_send', 'Channel not found', commandId);
    }

    const messageNewEvent: SocialEvent = {
      type: 'message_new',
      data: { ...messageData, id: messageId },
      timestamp: new Date().toISOString()
    };

    channel.members.forEach((memberId: string) => {
      connexionManager.sendToUser(memberId, messageNewEvent);
    });

    console.log(`[COMMAND] Game invitation ${invitationId} sent successfully`);
    sendSuccess(socket, 'game_invitation_send', { invitationId }, commandId);

  } catch (error) {
    console.error('[COMMAND] handleSendGameInvitation error:', error);
    sendError(socket, 'game_invitation_send', 'Internal server error', commandId);
  }
}

/* Gère l'acceptation d'invitation de jeu */
export async function handleAcceptGameInvitation(
  user: SocketUser,
  socket: WebSocket,
  data: RespondGameInvitationCommand
): Promise<void> {
  const { invitationId, commandId } = data;
  const userId = user.id;

  console.log(`[COMMAND] game_invitation_accept: ${userId} -> ${invitationId}`);

  if (!invitationId) {
    return sendError(socket, 'game_invitation_accept', 'invitationId is required', commandId);
  }

  try {
    const invitation = connexionManager.getInvitation(invitationId);
    if (!invitation) {
      return sendError(socket, 'game_invitation_accept', 'Invitation not found', commandId);
    }

    if (invitation.invitedId !== userId) {
      return sendError(socket, 'game_invitation_accept', 'Not authorized to accept this invitation', commandId);
    }

    if (invitation.status !== 'pending') {
      return sendError(socket, 'game_invitation_accept', `Invitation is ${invitation.status}`, commandId);
    }

    if (invitation.expiresAt < new Date()) {
      await connexionManager.expireInvitation(invitationId);
      return sendError(socket, 'game_invitation_accept', 'Invitation expired', commandId);
    }

    const gameRoomResponse = await fetch('http://game:3000/game/invitation-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invitationId,
        inviterId: invitation.inviterId,
        invitedId: invitation.invitedId
      })
    });

    if (!gameRoomResponse.ok) {
      const errorText = await gameRoomResponse.text();
      console.error('[COMMAND] Failed to create game room:', errorText);
      return sendError(socket, 'game_invitation_accept', 'Failed to create game room', commandId);
    }

    const { gameRoomId } = await gameRoomResponse.json();

    const updatedInvitation = connexionManager.acceptInvitation(invitationId, gameRoomId);

    await customFetch('http://database:3000/database/game_invitation', 'PUT', {
      id: invitationId,
      status: 'accepted',
      game_room_id: gameRoomId
    });

    if (updatedInvitation?.messageId) {
      await customFetch('http://database:3000/database/message', 'PUT', {
        id: updatedInvitation.messageId,
        metadata: JSON.stringify({
          invitationId,
          inviterId: invitation.inviterId,
          invitedId: invitation.invitedId,
          status: 'accepted',
          gameRoomId
        })
      });
    }

    const updateEvent: SocialEvent = {
      type: 'game_invitation_update',
      data: { invitationId, status: 'accepted', gameRoomId, inviterId: invitation.inviterId },
      timestamp: new Date().toISOString()
    };

    connexionManager.sendToUser(invitation.inviterId, updateEvent);
    connexionManager.sendToUser(invitation.invitedId, updateEvent);

    console.log(`[COMMAND] Game invitation ${invitationId} accepted, room: ${gameRoomId}`);
    sendSuccess(socket, 'game_invitation_accept', { gameRoomId }, commandId);

  } catch (error) {
    console.error('[COMMAND] handleAcceptGameInvitation error:', error);
    sendError(socket, 'game_invitation_accept', 'Internal server error', commandId);
  }
}

/* Gère le refus d'invitation de jeu */
export async function handleDeclineGameInvitation(
  user: SocketUser,
  socket: WebSocket,
  data: RespondGameInvitationCommand
): Promise<void> {
  const { invitationId, commandId } = data;
  const userId = user.id;

  console.log(`[COMMAND] game_invitation_decline: ${userId} -> ${invitationId}`);

  if (!invitationId) {
    return sendError(socket, 'game_invitation_decline', 'invitationId is required', commandId);
  }

  try {
    const invitation = connexionManager.getInvitation(invitationId);
    if (!invitation) {
      return sendError(socket, 'game_invitation_decline', 'Invitation not found', commandId);
    }

    if (invitation.invitedId !== userId) {
      return sendError(socket, 'game_invitation_decline', 'Not authorized to decline this invitation', commandId);
    }

    if (invitation.status !== 'pending') {
      return sendError(socket, 'game_invitation_decline', `Invitation is ${invitation.status}`, commandId);
    }

    const updatedInvitation = connexionManager.declineInvitation(invitationId);

    await customFetch('http://database:3000/database/game_invitation', 'PUT', {
      id: invitationId,
      status: 'declined'
    });

    if (updatedInvitation?.messageId) {
      await customFetch('http://database:3000/database/message', 'PUT', {
        id: updatedInvitation.messageId,
        metadata: JSON.stringify({
          invitationId,
          inviterId: invitation.inviterId,
          invitedId: invitation.invitedId,
          status: 'declined'
        })
      });
    }

    const channel = await customFetch('http://database:3000/database/channel', 'GET',
      { id: invitation.channelId }) as Channel;

    if (channel) {
      const updateEvent: SocialEvent = {
        type: 'game_invitation_update',
        data: { invitationId, status: 'declined' },
        timestamp: new Date().toISOString()
      };

      channel.members.forEach((memberId: string) => {
        connexionManager.sendToUser(memberId, updateEvent);
      });
    }

    console.log(`[COMMAND] Game invitation ${invitationId} declined`);
    sendSuccess(socket, 'game_invitation_decline', {}, commandId);

  } catch (error) {
    console.error('[COMMAND] handleDeclineGameInvitation error:', error);
    sendError(socket, 'game_invitation_decline', 'Internal server error', commandId);
  }
}

/* TOURNAMENT INVITATION HANDLERS */

/* Gère l'envoi d'invitation de tournoi */
export async function handleSendTournamentInvitation(
  user: SocketUser,
  socket: WebSocket,
  data: SendTournamentInvitationCommand
): Promise<void> {
  const { tournamentId, invitedUserId, commandId } = data;
  const inviterId = user.id;

  console.log(`[COMMAND] tournament_invitation_send: ${inviterId} -> ${invitedUserId} for tournament ${tournamentId}`);

  if (inviterId === invitedUserId) {
    return sendError(socket, 'tournament_invitation_send', 'Cannot invite yourself', commandId);
  }

  if (!tournamentId || !invitedUserId) {
    return sendError(socket, 'tournament_invitation_send', 'tournamentId and invitedUserId are required', commandId);
  }

  try {
    const friends = await customFetch('http://database:3000/database/friends', 'GET',
      { user_id: inviterId }) as any[];
    if (!friends || !friends.some((f: any) => f.id === invitedUserId)) {
      return sendError(socket, 'tournament_invitation_send', 'Can only invite friends', commandId);
    }

    if (await areUsersBlocked(inviterId, invitedUserId)) {
      return sendError(socket, 'tournament_invitation_send', 'Cannot invite blocked user', commandId);
    }

    let tournament: any;
    try {
      const response = await fetch(`http://tournament:3000/tournament/${tournamentId}`);
      if (!response.ok) {
        return sendError(socket, 'tournament_invitation_send', 'Tournament not found', commandId);
      }
      tournament = await response.json();
    } catch (err) {
      console.error('[COMMAND] Failed to fetch tournament:', err);
      return sendError(socket, 'tournament_invitation_send', 'Failed to fetch tournament', commandId);
    }

    if (tournament.odStatus !== 'waiting') {
      return sendError(socket, 'tournament_invitation_send', 'Tournament has already started', commandId);
    }

    if (tournament.odPlayers.length >= tournament.odMaxPlayers) {
      return sendError(socket, 'tournament_invitation_send', 'Tournament is full', commandId);
    }

    if (tournament.odPlayers.some((p: any) => p.odUserId === invitedUserId)) {
      return sendError(socket, 'tournament_invitation_send', 'User is already in this tournament', commandId);
    }

    let channelId = await customFetch('http://database:3000/database/channel/find-dm', 'GET',
      { user1_id: inviterId, user2_id: invitedUserId }) as string | null;

    if (!channelId) {
      const newChannelId = randomUUID();
      await customFetch('http://database:3000/database/channel', 'POST', {
        id: newChannelId,
        name: null,
        type: 'private',
        created_by: inviterId
      });

      await customFetch('http://database:3000/database/channel/member', 'POST', {
        channel_id: newChannelId,
        user_id: inviterId,
        role: 'owner'
      });
      await customFetch('http://database:3000/database/channel/member', 'POST', {
        channel_id: newChannelId,
        user_id: invitedUserId,
        role: 'member'
      });

      channelId = newChannelId;
    }

    const invitationId = randomUUID();
    const inviterUser = await getUserPublic(inviterId);
    const tournamentName = tournament.odName || `Tournament #${tournamentId.slice(-6)}`;
    const messageContent = `${inviterUser?.name || 'Someone'} invites you to join the tournament "${tournamentName}"!`;

    const invitationMetadata = {
      invitationId,
      tournamentId,
      tournamentName,
      inviterId,
      inviterName: inviterUser?.name,
      invitedId: invitedUserId,
      status: 'pending',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };

    const messageData = {
      channel_id: channelId,
      sender_id: inviterId,
      content: messageContent,
      type: 'tournament_invitation',
      metadata: JSON.stringify(invitationMetadata),
      sent_at: new Date().toISOString(),
      read_at: null
    };

    const messageId = await customFetch('http://database:3000/database/message', 'POST',
      messageData) as number;

    if (!messageId) {
      return sendError(socket, 'tournament_invitation_send', 'Failed to create invitation message', commandId);
    }

    connexionManager.createTournamentInvitation(invitationId, inviterId, invitedUserId,
      tournamentId, channelId, messageId, tournamentName);

    const channel = await customFetch('http://database:3000/database/channel', 'GET',
      { id: channelId }) as Channel;

    if (channel) {
      const messageNewEvent: SocialEvent = {
        type: 'message_new',
        data: { ...messageData, id: messageId },
        timestamp: new Date().toISOString()
      };

      channel.members.forEach((memberId: string) => {
        connexionManager.sendToUser(memberId, messageNewEvent);
      });
    }

    console.log(`[COMMAND] Tournament invitation ${invitationId} sent successfully`);
    sendSuccess(socket, 'tournament_invitation_send', { invitationId }, commandId);

  } catch (error) {
    console.error('[COMMAND] handleSendTournamentInvitation error:', error);
    sendError(socket, 'tournament_invitation_send', 'Internal server error', commandId);
  }
}

/* Gère l'acceptation d'invitation de tournoi */
export async function handleAcceptTournamentInvitation(
  user: SocketUser,
  socket: WebSocket,
  data: RespondTournamentInvitationCommand
): Promise<void> {
  const { invitationId, commandId } = data;
  const userId = user.id;

  console.log(`[COMMAND] tournament_invitation_accept: ${userId} -> ${invitationId}`);

  try {
    const invitation = connexionManager.getTournamentInvitation(invitationId);

    if (!invitation) {
      return sendError(socket, 'tournament_invitation_accept', 'Invitation not found or expired', commandId);
    }

    if (invitation.invitedId !== userId) {
      return sendError(socket, 'tournament_invitation_accept', 'You are not the invited user', commandId);
    }

    if (invitation.status !== 'pending') {
      return sendError(socket, 'tournament_invitation_accept', `Invitation already ${invitation.status}`, commandId);
    }

    const userPublic = await getUserPublic(userId);
    const alias = userPublic?.name || `Player_${userId.slice(-6)}`;

    try {
      const response = await fetch(`http://tournament:3000/tournament/${invitation.tournamentId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias, userId })
      });

      if (!response.ok) {
        const error = await response.json();
        return sendError(socket, 'tournament_invitation_accept', error.error || 'Failed to join tournament', commandId);
      }

      const result = await response.json();

      connexionManager.updateTournamentInvitationStatus(invitationId, 'accepted');

      if (invitation.messageId) {
        await customFetch('http://database:3000/database/message', 'PUT', {
          id: invitation.messageId,
          metadata: JSON.stringify({
            invitationId,
            tournamentId: invitation.tournamentId,
            tournamentName: invitation.tournamentName,
            inviterId: invitation.inviterId,
            invitedId: invitation.invitedId,
            status: 'accepted'
          })
        });
      }

      const channel = await customFetch('http://database:3000/database/channel', 'GET',
        { id: invitation.channelId }) as Channel;

      if (channel) {
        const updateEvent: SocialEvent = {
          type: 'tournament_invitation_update',
          data: {
            invitationId,
            status: 'accepted',
            tournamentId: invitation.tournamentId,
            playerId: result.playerId
          },
          timestamp: new Date().toISOString()
        };

        channel.members.forEach((memberId: string) => {
          connexionManager.sendToUser(memberId, updateEvent);
        });
      }

      console.log(`[COMMAND] Tournament invitation ${invitationId} accepted, joined tournament ${invitation.tournamentId}`);
      sendSuccess(socket, 'tournament_invitation_accept', {
        tournamentId: invitation.tournamentId,
        playerId: result.playerId
      }, commandId);

    } catch (err) {
      console.error('[COMMAND] Failed to join tournament:', err);
      return sendError(socket, 'tournament_invitation_accept', 'Failed to join tournament', commandId);
    }

  } catch (error) {
    console.error('[COMMAND] handleAcceptTournamentInvitation error:', error);
    sendError(socket, 'tournament_invitation_accept', 'Internal server error', commandId);
  }
}

/* Gère le refus d'invitation de tournoi */
export async function handleDeclineTournamentInvitation(
  user: SocketUser,
  socket: WebSocket,
  data: RespondTournamentInvitationCommand
): Promise<void> {
  const { invitationId, commandId } = data;
  const userId = user.id;

  console.log(`[COMMAND] tournament_invitation_decline: ${userId} -> ${invitationId}`);

  try {
    const invitation = connexionManager.getTournamentInvitation(invitationId);

    if (!invitation) {
      return sendError(socket, 'tournament_invitation_decline', 'Invitation not found or expired', commandId);
    }

    if (invitation.invitedId !== userId) {
      return sendError(socket, 'tournament_invitation_decline', 'You are not the invited user', commandId);
    }

    if (invitation.status !== 'pending') {
      return sendError(socket, 'tournament_invitation_decline', `Invitation already ${invitation.status}`, commandId);
    }

    connexionManager.updateTournamentInvitationStatus(invitationId, 'declined');

    if (invitation.messageId) {
      await customFetch('http://database:3000/database/message', 'PUT', {
        id: invitation.messageId,
        metadata: JSON.stringify({
          invitationId,
          tournamentId: invitation.tournamentId,
          tournamentName: invitation.tournamentName,
          inviterId: invitation.inviterId,
          invitedId: invitation.invitedId,
          status: 'declined'
        })
      });
    }

    const channel = await customFetch('http://database:3000/database/channel', 'GET',
      { id: invitation.channelId }) as Channel;

    if (channel) {
      const updateEvent: SocialEvent = {
        type: 'tournament_invitation_update',
        data: { invitationId, status: 'declined' },
        timestamp: new Date().toISOString()
      };

      channel.members.forEach((memberId: string) => {
        connexionManager.sendToUser(memberId, updateEvent);
      });
    }

    console.log(`[COMMAND] Tournament invitation ${invitationId} declined`);
    sendSuccess(socket, 'tournament_invitation_decline', {}, commandId);

  } catch (error) {
    console.error('[COMMAND] handleDeclineTournamentInvitation error:', error);
    sendError(socket, 'tournament_invitation_decline', 'Internal server error', commandId);
  }
}
