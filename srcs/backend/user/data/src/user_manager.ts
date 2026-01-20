import { User, UserPublic, Channel, Friendship, BlockedUser, generateFriendshipKey, Message } from './shared/with_front/types';
import { randomUUID } from 'crypto';
import customFetch from './shared/utils/fetch';

export const userManager = {
  users: new Map<string, User>(),
  channels: new Map<string, Channel>(),
  friends: new Map<string, Friendship>(),
  blockeds: new Map<string, BlockedUser>(),

  async getFriends(userId: string): Promise<UserPublic[]> {
    const userFriends: UserPublic[] = [];

    for (const [key, friendship] of this.friends.entries()) {
      if (key.includes(userId)) {
        const otherUser = friendship.user1.id === userId ? friendship.user2 : friendship.user1;
        userFriends.push({
          id: otherUser.id,
          name: otherUser.name,
          avatar: otherUser.avatar,
          status: otherUser.status
        });
      }
    }

    if (userFriends.length === 0) {
      try {
        const friend_ids = await customFetch('http://database:3000/database/friends', 'GET', {
          user_id: userId
        }) as string[] || [];

        for (const friendId of friend_ids) {
          const user = await this.getUser(userId);
          const friend = await this.getUser(friendId);

          if (user && friend) {
            const friendshipKey = generateFriendshipKey(userId, friendId);
            const friendship: Friendship = {
              user1: user,
              user2: friend,
              status: 'accepted',
              createdAt: new Date().toISOString()
            };
            this.friends.set(friendshipKey, friendship);

            userFriends.push(friend as UserPublic);
          }
        }
      } catch (error) {
        console.error(`[UserManager] Failed to load friends for user ${userId}:`, error);
      }
    }

    return userFriends;
  },

  async getBlockedUsers(userId: string): Promise<UserPublic[]> {
    const blockedUsers: UserPublic[] = [];

    for (const [key, blockedUser] of this.blockeds.entries()) {
      if (blockedUser.blockerId.id === userId) {
        blockedUsers.push(blockedUser.blockedId as UserPublic);
      }
    }

    if (blockedUsers.length === 0) {
      try {
        const blockedUserIds = await customFetch('http://database:3000/database/blocked', 'GET', {
          user_id: userId
        }) as string[] || [];

        for (const blockedId of blockedUserIds) {
          const blocker = await this.getUser(userId);
          const blocked = await this.getUser(blockedId);

          if (blocker && blocked) {
            const blockKey = generateFriendshipKey(userId, blockedId);
            const blockedUserObj: BlockedUser = {
              blockerId: blocker,
              blockedId: blocked,
              createdAt: new Date().toISOString()
            };
            this.blockeds.set(blockKey, blockedUserObj);

            blockedUsers.push({
              id: blocked.id,
              name: blocked.name,
              avatar: blocked.avatar,
              status: blocked.status
            });
          }
        }
      } catch (error) {
        console.error(`[UserManager] Failed to load blocked users for user ${userId}:`, error);
      }
    }

    return blockedUsers;
  },

  async getUsers(userIds: string[]): Promise<UserPublic[]> {
    const users: UserPublic[] = [];
    for (const userId of userIds) {
      const user = await this.getUser(userId);
      if (user) {
        users.push(user);
      }
    }
    return users;
  },

  async getUser(userId: string): Promise<User | null> {
    if (this.users.has(userId)) {
      return this.users.get(userId)!;
    }
    try {
      const users = await customFetch(`http://database:3000/database/user`, 'GET', { id: userId }) as User[];
      if (!users || users.length === 0) {
        console.error(`[UserManager] User ${userId} not found in database`);
        return null;
      }
      const user = users[0];
      this.users.set(userId, user);
      return user;
    } catch (error) {
      console.error(`[UserManager] Failed to load user ${userId}:`, error);
      return null;
    }
  },

  async addFriend(userId: string, friendId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    const friend = await this.getUser(friendId);

    if (!user || !friend) return false;

    const friendshipKey = generateFriendshipKey(userId, friendId);

    if (this.friends.has(friendshipKey)) {
      console.log(`[UserManager] Friendship already exists`);
      return false;
    }

    try {
      const success = await customFetch('http://database:3000/database/friends', 'POST', {
        user_id: userId,
        friend_id: friendId
      }) as boolean;

      if (!success) {
        return false;
      }

      const friendship: Friendship = {
        user1: user,
        user2: friend,
        status: 'accepted',
        createdAt: new Date().toISOString()
      };

      this.friends.set(friendshipKey, friendship);

      console.log(`[UserManager] Added friendship ${friendshipKey} to cache`);
      return true;
    } catch (error) {
      console.error('[UserManager] Failed to add friendship:', error);
      return false;
    }
  },

  async removeFriend(userId: string, friendId: string): Promise<boolean> {
    const friendshipKey = generateFriendshipKey(userId, friendId);

    try {
      const success = await customFetch('http://database:3000/database/friends', 'DELETE', {
        user_id: userId,
        friend_id: friendId
      }) as boolean;

      if (!success) {
        console.log(`[UserManager] Friendship does not exist between ${userId} and ${friendId}`);
        return false;
      }

      this.friends.delete(friendshipKey);

      console.log(`[UserManager] Removed friendship ${friendshipKey} from cache`);
      return true;
    } catch (error) {
      console.error('[UserManager] Failed to remove friendship:', error);
      return false;
    }
  },

  async blockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const blocker = await this.getUser(blockerId);
    const blocked = await this.getUser(blockedId);

    if (!blocker || !blocked) return false;

    const blockKey = generateFriendshipKey(blockerId, blockedId);

    if (this.blockeds.has(blockKey)) {
      console.log(`[UserManager] Block already exists`);
      return false;
    }

    try {
      const success = await customFetch('http://database:3000/database/blocked', 'POST', {
        user_id: blockerId,
        blocked_user_id: blockedId
      }) as boolean;

      if (!success) return false;

      const blockedUserObj: BlockedUser = {
        blockerId: blocker,
        blockedId: blocked,
        createdAt: new Date().toISOString()
      };

      this.blockeds.set(blockKey, blockedUserObj);

      console.log(`[UserManager] Added block ${blockKey} to cache`);
      return true;
    } catch (error) {
      console.error('[UserManager] Failed to block user:', error);
      return false;
    }
  },

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const blockKey = generateFriendshipKey(blockerId, blockedId);

    try {
      const success = await customFetch('http://database:3000/database/blocked', 'DELETE', {
        user_id: blockerId,
        blocked_user_id: blockedId
      }) as boolean;

      if (!success) {
        console.log(`[UserManager] Block does not exist between ${blockerId} and ${blockedId}`);
        return false;
      }

      this.blockeds.delete(blockKey);

      console.log(`[UserManager] Removed block ${blockKey} from cache`);
      return true;
    } catch (error) {
      console.error('[UserManager] Failed to unblock user:', error);
      return false;
    }
  },

  async getUsersFromChannel(channel_id: number): Promise<string[]> {
    const channel = await this.getChannel(String(channel_id));
    return channel?.members || [];
  },

  async getChannel(channel_id: string): Promise<Channel | null> {
    if (this.channels.has(channel_id)) {
      return this.channels.get(channel_id)!;
    }
    try {
      const channel = await customFetch(`http://database:3000/database/channel`, 'GET', { id: channel_id }) as Channel;
      if (!channel) {
        console.error(`[UserManager] Channel ${channel_id} not found in database`);
        return null;
      }
      this.channels.set(channel_id, channel);
      return channel;
    } catch (error) {
      console.error(`[UserManager] Failed to load channel ${channel_id}:`, error);
      return null;
    }
  },

  async getChannels(user_id: string): Promise<Channel[]> {
    try {
      const response = await customFetch(`http://database:3000/database/user/channels`, 'GET', { user_id }) as Channel[];
      return response || [];
    } catch (error) {
      console.error(`[UserManager] Failed to load channels for user ${user_id}:`, error);
      return [];
    }
  },

  async setChannel(channel: Channel): Promise<boolean | null> {
    if (!channel || !channel.id)
      return false;
    this.channels.set(channel.id, channel);

    for (const memberId of channel.members) {
      const user = await this.getUser(memberId);
      if (!user) continue;
      if (!user.channels) user.channels = [];
      if (!user.channels.some(c => c.id === channel.id))
        user.channels.push(channel);
    }
    return true;
  },

  async sendMessage(message: Message): Promise<{ success: boolean, message: Message | undefined }> {
    const senderUser = await this.getUser(message.sender_id);
    if (!senderUser) {
      console.error('[UserManager] Sender not found');
      return { success: false, message: undefined };
    }

    if (!senderUser.blocked_users) senderUser.blocked_users = [];

    const channelMembers = await this.getUsersFromChannel(message.channel_id);
    if (!channelMembers || channelMembers.length === 0) {
      console.error('[UserManager] No members in channel');
      return { success: false, message: undefined };
    }

    for (const memberId of channelMembers) {
      if (memberId === message.sender_id) continue;

      const member = await this.getUser(memberId);

      if (member?.blocked_users?.includes(message.sender_id)) {
        console.log(`[UserManager] User ${memberId} has blocked sender ${message.sender_id} - message rejected`);
        return { success: false, message: undefined };
      }

      if (senderUser.blocked_users?.includes(memberId)) {
        console.log(`[UserManager] Sender ${message.sender_id} has blocked user ${memberId} - message rejected`);
        return { success: false, message: undefined };
      }
    }

    try {
      const messageId = await customFetch('http://database:3000/database/message', 'POST', message) as string;
      if (!messageId) {
        console.error('[UserManager] Failed to save message to database');
        return { success: false, message: undefined };
      }

      message.id = parseInt(messageId);

      const channel = await this.getChannel(String(message.channel_id));
      if (channel) {
        if (!channel.messages) channel.messages = [];
        channel.messages.push(message);
        console.log(`[UserManager] Added message ${message.id} to channel ${channel.id} in-memory cache`);
      }

      await customFetch('http://social:3000/social/notify/message_new', 'POST', {
        userIds: channelMembers,
        message: message
      });

      return { success: true, message: message };
    } catch (error) {
      console.error('[UserManager] Failed to send message:', error);
      return { success: false, message: undefined };
    }
  }
}
