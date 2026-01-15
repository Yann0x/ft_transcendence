import { User, UserPublic, Channel } from './shared/with_front/types';
import { randomUUID } from 'crypto';
import customFetch from './shared/utils/fetch';

export const userManager = {
   users: new Map<string, User>(),
   channels: new Map<string, Channel>(),

  // Load user from DB if not in memory
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

      // Load friends from database
      try {
        const friends = await customFetch('http://database:3000/database/friends', 'GET', {
          user_id: userId
        }) as UserPublic[];
        user.friends = friends || [];
      } catch (error) {
        console.error(`[UserManager] Failed to load friends for user ${userId}:`, error);
        user.friends = [];
      }

      // Load blocked users from database
      try {
        const blockedUsers = await customFetch('http://database:3000/database/blocked', 'GET', {
          user_id: userId
        }) as string[];
        user.blocked_users = blockedUsers || [];
      } catch (error) {
        console.error(`[UserManager] Failed to load blocked users for user ${userId}:`, error);
        user.blocked_users = [];
      }

      this.users.set(userId, user);
      return user;
    } catch (error) {
      console.error(`[UserManager] Failed to load user ${userId}:`, error);
      return null;
    }
  },

  // Add user to memory
  setUser(user: User): void {
    if (user.id) {
      this.users.set(user.id, user);
    }
  },

  // Add friend relationship
  async addFriend(userId: string, friendId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    const friend = await this.getUser(friendId);

    if (!user || !friend) return false;

    // Add friendship to database
    try {
      const success = await customFetch('http://database:3000/database/friends', 'POST', {
        user_id: userId,
        friend_id: friendId
      }) as boolean;

      if (!success) {
        console.log(`[UserManager] Friendship already exists between ${userId} and ${friendId}`);
        return false;
      }

      // Update in-memory cache
      if (!user.friends) user.friends = [];
      if (!friend.friends) friend.friends = [];

      // Add to both users' friend lists in memory
      if (!user.friends.some((f: UserPublic) => f.id === friendId)) {
        user.friends.push({ id: friend.id, name: friend.name, avatar: friend.avatar, status: friend.status });
      }
      if (!friend.friends.some((f: UserPublic) => f.id === userId)) {
        friend.friends.push({ id: user.id, name: user.name, avatar: user.avatar, status: user.status });
      }
    } catch (error) {
      console.error('[UserManager] Failed to add friendship to database:', error);
      return false;
    }

    // Check if DM channel already exists, if not create it
    try {
      // Check if a DM channel already exists between these two users
      const existingChannelId = await customFetch('http://database:3000/database/channel/find-dm', 'GET', {
        user1_id: userId,
        user2_id: friendId
      }) as number | null;

      if (existingChannelId) {
        console.log(`[UserManager] DM channel ${existingChannelId} already exists between ${userId} and ${friendId}`);
        // Channel already exists, no need to create a new one
      } else {
        // Create new DM channel (name left undefined for private channels)
        const channelId = randomUUID();
        const channelData = {
          id: channelId,
          type: 'private',
          created_by: userId,
          created_at: new Date().toISOString()
        };

        const result = await customFetch('http://database:3000/database/channel', 'POST', channelData) as string;

        if (result) {
          console.log(`[UserManager] Created new DM channel ${channelId} between ${userId} and ${friendId}`);
          // Add both users as members
          await customFetch('http://database:3000/database/channel/member', 'POST', {
            channel_id: channelId,
            user_id: userId,
            role: 'owner'
          });
          await customFetch('http://database:3000/database/channel/member', 'POST', {
            channel_id: channelId,
            user_id: friendId,
            role: 'member'
          });

          // Fetch the created channel and add to both users
          const channel = await this.getChannel(channelId);
          if (channel) {
            await this.setChannel(channel);
          }
        }
      }
    } catch (error) {
      console.error('[UserManager] Failed to handle DM channel:', error);
    }

    return true;
  },

  // Remove friend relationship
  async removeFriend(userId: string, friendId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    const friend = await this.getUser(friendId);
    if (!user || !friend) return false;

    // Remove friendship from database
    try {
      const success = await customFetch('http://database:3000/database/friends', 'DELETE', {
        user_id: userId,
        friend_id: friendId
      }) as boolean;

      if (!success) {
        console.log(`[UserManager] Friendship does not exist between ${userId} and ${friendId}`);
        return false;
      }

      // Update in-memory cache - remove from both users' friend lists
      if (user.friends) {
        user.friends = user.friends.filter((f: UserPublic) => f.id !== friendId);
      }
      if (friend.friends) {
        friend.friends = friend.friends.filter((f: UserPublic) => f.id !== userId);
      }

      return true;
    } catch (error) {
      console.error('[UserManager] Failed to remove friendship from database:', error);
      return false;
    }
  },

  // Get user's friends
  async getFriends(userId: string): Promise<UserPublic[]> {
    try {
      // Fetch friends from database
      const friends = await customFetch('http://database:3000/database/friends', 'GET', {
        user_id: userId
      }) as UserPublic[];

      // Update in-memory cache
      const user = await this.getUser(userId);
      if (user) {
        user.friends = friends;
      }

      return friends || [];
    } catch (error) {
      console.error('[UserManager] Failed to get friends from database:', error);
      return [];
    }
  },

  async getUsersFromChannel(channel_id: number): Promise<string[]>
  {
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

  async getChannels(user_id: string): Promise <Channel[]>
  {
    try {
      // Get all channels where user is a member from database
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
      // Only add if not already present
      if (!user.channels.some(c => c.id === channel.id))
        user.channels.push(channel);
    }
    return true;
  },

  async sendMessage(message: Message): Promise<{success: boolean, message: Message | undefined}>
  {
    const senderUser = await this.getUser(message.sender_id);
    if (!senderUser) {
      console.error('[UserManager] Sender not found');
      return {success: false, message: undefined};
    }

    // Initialize blocked_users if not present
    if (!senderUser.blocked_users) senderUser.blocked_users = [];

    // Get all members of the channel
    const channelMembers = await this.getUsersFromChannel(message.channel_id);
    if (!channelMembers || channelMembers.length === 0) {
      console.error('[UserManager] No members in channel');
      return {success: false, message: undefined};
    }

    // Check symmetric blocking - reject if ANY blocking exists in either direction
    for (const memberId of channelMembers) {
      if (memberId === message.sender_id) continue; // Skip sender

      const member = await this.getUser(memberId);

      // Check if member has blocked sender OR sender has blocked member (symmetric)
      if (member?.blocked_users?.includes(message.sender_id)) {
        console.log(`[UserManager] User ${memberId} has blocked sender ${message.sender_id} - message rejected`);
        return {success: false, message: undefined};
      }

      if (senderUser.blocked_users?.includes(memberId)) {
        console.log(`[UserManager] Sender ${message.sender_id} has blocked user ${memberId} - message rejected`);
        return {success: false, message: undefined};
      }
    }

    // No blocking detected - save and deliver message normally
    try {
      const messageId = await customFetch('http://database:3000/database/message', 'POST', message) as string;
      if (!messageId) {
        console.error('[UserManager] Failed to save message to database');
        return {success: false, message: undefined};
      }

      // Add the message ID to the message object
      message.id = parseInt(messageId);

      // Add message to in-memory channel cache
      const channel = await this.getChannel(String(message.channel_id));
      if (channel) {
        if (!channel.messages) channel.messages = [];
        channel.messages.push(message);
        console.log(`[UserManager] Added message ${message.id} to channel ${channel.id} in-memory cache`);
      }

      // Notify all channel members
      await customFetch('http://social:3000/social/notify/message_new', 'POST', {
        userIds: channelMembers,
        message: message
      });

      return {success: true, message: message};
    } catch (error) {
      console.error('[UserManager] Failed to send message:', error);
      return {success: false};
    }
  }
}