import { User, User } from './shared/with_front/types';
import customFetch from './shared/utils/fetch';

export const userManager = {
   users: new Map<string, User>(),

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

    // Initialize friends arrays if needed
    if (!user.friends) user.friends = [];
    if (!friend.friends) friend.friends = [];

    // Check if already friends
    if (user.friends.some(f => f.id === friendId)) return false;

    // Add to both users' friend lists
    user.friends.push({ id: friend.id, name: friend.name, avatar: friend.avatar, status: friend.status });
    friend.friends.push({ id: user.id, name: user.name, avatar: user.avatar, status: user.status });

    return true;
  },

  // Remove friend relationship 
  async removeFriend(userId: string, friendId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    const friend = await this.getUser(friendId);

    if (!user || !friend) return false;

    // Remove from both users' friend lists
    if (user.friends) {
      user.friends = user.friends.filter(f => f.id !== friendId);
    }
    if (friend.friends) {
      friend.friends = friend.friends.filter(f => f.id !== userId);
    }

    return true;
  },

  // Get user's friends
  async getFriends(userId: string): Promise<User[]> {
    const user = await this.getUser(userId);
    return user?.friends || [];
  },
}
