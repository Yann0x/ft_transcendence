import { socialClient } from './social-client';
import type { SocialEvent } from './types';

let commandIdCounter = 0;

function generateCommandId(): string {
  return `cmd_${Date.now()}_${++commandIdCounter}`;
}

interface CommandPromise {
  resolve: (data: any) => void;
  reject: (error: string) => void;
}

const pendingCommands = new Map<string, CommandPromise>();

socialClient.on('command_success', (event: SocialEvent) => {
  const { commandId, data } = event.data;
  if (commandId && pendingCommands.has(commandId)) {
    const pending = pendingCommands.get(commandId)!;
    pendingCommands.delete(commandId);
    pending.resolve(data);
  }
});

socialClient.on('command_error', (event: SocialEvent) => {
  const { commandId, message } = event.data;
  if (commandId && pendingCommands.has(commandId)) {
    const pending = pendingCommands.get(commandId)!;
    pendingCommands.delete(commandId);
    pending.reject(message || 'Command failed');
  }
});

function sendCommand<T = any>(type: string, data: any): Promise<T> {
  console.log(`[SOCIAL-COMMANDS] sends '${type}' with ${JSON.stringify(data)}`);
  return new Promise((resolve, reject) => {
    const commandId = generateCommandId();
    pendingCommands.set(commandId, { resolve, reject});
    const command: SocialEvent = {
      type: type as any,
      data: { ...data, commandId },
      timestamp: new Date().toISOString()
    };
    socialClient.send(command);
  });
}

export async function addFriend(friendId: string): Promise<{ friend: any; channel: any }> {
  return sendCommand('add_friend', { friendId });
}

export async function removeFriend(friendId: string): Promise<void> {
  return sendCommand('remove_friend', { friendId });
}

export async function sendMessage(channelId: string, content: string): Promise<{ message: any }> {
  return sendCommand('send_message', { channelId, content });
}

export async function blockUser(blockedId: string): Promise<void> {
  return sendCommand('block_user', { userId: blockedId });
}

export async function unblockUser(blockedId: string): Promise<void> {
  return sendCommand('unblock_user', { userId: blockedId });
}

export async function markRead(channelId: string): Promise<void> {
  return sendCommand('mark_read', { channelId });
}

export async function sendGameInvitation(channelId: string, invitedUserId: string): Promise<{ invitationId: string }> {
  return sendCommand('game_invitation_send', { channelId, invitedUserId });
}

export async function acceptGameInvitation(invitationId: string): Promise<{ gameRoomId: string }> {
  return sendCommand('game_invitation_accept', { invitationId, accept: true });
}

export async function declineGameInvitation(invitationId: string): Promise<void> {
  return sendCommand('game_invitation_decline', { invitationId, accept: false });
}
