import { SocketStream } from '@fastify/websocket';
import { SocialEvent } from './shared/with_front/types';

interface UserConnection {
  userId: string;
  socket: SocketStream;
  authenticated: boolean;
}

/**
 * Manages WebSocket connections for the social service
 * Tracks online users and provides methods to broadcast events
 */
class ConnectionManager {
  private connections: Map<string, Set<SocketStream>> = new Map();
  private socketToUser: Map<SocketStream, string> = new Map();

  /**
   * Add a connection for a user (after authentication)
   */
  addConnection(userId: string, socket: SocketStream): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(socket);
    this.socketToUser.set(socket, userId);

    console.log(`[SOCIAL] User ${userId} connected. Total online: ${this.connections.size}`);
  }

  /**
   * Remove a connection
   */
  removeConnection(socket: SocketStream): string | null {
    const userId = this.socketToUser.get(socket);
    if (!userId) return null;

    const userSockets = this.connections.get(userId);
    if (userSockets) {
      userSockets.delete(socket);
      if (userSockets.size === 0) {
        this.connections.delete(userId);
      }
    }
    this.socketToUser.delete(socket);

    console.log(`[SOCIAL] User ${userId} disconnected. Total online: ${this.connections.size}`);
    return userId;
  }

  /**
   * Get all sockets for a specific user
   */
  getUserSockets(userId: string): Set<SocketStream> | undefined {
    return this.connections.get(userId);
  }

  /**
   * Check if a user is online (has at least one active connection)
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.connections.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  /**
   * Get all online user IDs
   */
  getOnlineUserIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get user ID for a socket
   */
  getUserId(socket: SocketStream): string | undefined {
    return this.socketToUser.get(socket);
  }

  /**
   * Send an event to a specific user (all their connections)
   */
  sendToUser(userId: string, event: SocialEvent): void {
    const sockets = this.connections.get(userId);
    if (!sockets || sockets.size === 0) {
      console.log(`[SOCIAL] User ${userId} not online, cannot send event ${event.type}`);
      return;
    }

    const message = JSON.stringify(event);
    sockets.forEach(socket => {
      try {
        socket.send(message);
      } catch (error) {
        console.error(`[SOCIAL] Error sending to user ${userId}:`, error);
      }
    });
  }

  /**
   * Send an event to multiple users
   */
  sendToUsers(userIds: string[], event: SocialEvent): void {
    userIds.forEach(userId => this.sendToUser(userId, event));
  }

  /**
   * Broadcast an event to all connected users
   */
  broadcast(event: SocialEvent): void {
    const message = JSON.stringify(event);
    this.connections.forEach((sockets, userId) => {
      sockets.forEach(socket => {
        try {
          socket.send(message);
        } catch (error) {
          console.error(`[SOCIAL] Error broadcasting to user ${userId}:`, error);
        }
      });
    });
  }

  /**
   * Get connection statistics
   */
  getStats(): { totalUsers: number; totalConnections: number } {
    let totalConnections = 0;
    this.connections.forEach(sockets => {
      totalConnections += sockets.size;
    });
    return {
      totalUsers: this.connections.size,
      totalConnections
    };
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager();
