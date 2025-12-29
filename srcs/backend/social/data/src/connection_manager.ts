import { SocketStream } from '@fastify/websocket';
import { SocialEvent } from './shared/with_front/types';

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
   * Also performs cleanup of dead sockets found during the check
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.connections.get(userId);
    if (!sockets || sockets.size === 0) {
      return false;
    }

    // Check if any sockets are actually alive
    const deadSockets: SocketStream[] = [];
    sockets.forEach(socket => {
      if (socket.readyState !== socket.OPEN) {
        deadSockets.push(socket);
      }
    });

    // Clean up dead sockets if found
    if (deadSockets.length > 0) {
      deadSockets.forEach(socket => {
        sockets.delete(socket);
        this.socketToUser.delete(socket);
      });

      // Remove user if no active connections remain
      if (sockets.size === 0) {
        this.connections.delete(userId);
        console.log(`[SOCIAL] isUserOnline cleanup: User ${userId} removed (no active connections)`);
        return false;
      }
    }

    return sockets.size > 0;
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
    const deadSockets: SocketStream[] = [];

    sockets.forEach(socket => {
      try {
        // Check if socket is still open before sending
        if (socket.readyState === socket.OPEN) {
          socket.send(message);
        } else {
          console.log(`[SOCIAL] Socket for user ${userId} is not open (state: ${socket.readyState}), marking as dead`);
          deadSockets.push(socket);
        }
      } catch (error) {
        console.error(`[SOCIAL] Error sending to user ${userId}:`, error);
        // Mark socket as dead if send fails
        deadSockets.push(socket);
      }
    });

    // Clean up dead sockets
    if (deadSockets.length > 0) {
      deadSockets.forEach(socket => {
        sockets.delete(socket);
        this.socketToUser.delete(socket);
      });

      // If user has no more connections, remove them from the map
      if (sockets.size === 0) {
        this.connections.delete(userId);
        console.log(`[SOCIAL] User ${userId} has no more active connections, removed from online users`);
      } else {
        console.log(`[SOCIAL] Removed ${deadSockets.length} dead socket(s) for user ${userId}, ${sockets.size} remaining`);
      }
    }
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
    const usersToCleanup: string[] = [];

    this.connections.forEach((sockets, userId) => {
      const deadSockets: SocketStream[] = [];

      sockets.forEach(socket => {
        try {
          // Check if socket is still open before sending
          if (socket.readyState === socket.OPEN) {
            socket.send(message);
          } else {
            deadSockets.push(socket);
          }
        } catch (error) {
          console.error(`[SOCIAL] Error broadcasting to user ${userId}:`, error);
          deadSockets.push(socket);
        }
      });

      // Clean up dead sockets for this user
      if (deadSockets.length > 0) {
        deadSockets.forEach(socket => {
          sockets.delete(socket);
          this.socketToUser.delete(socket);
        });

        // Mark user for cleanup if they have no more connections
        if (sockets.size === 0) {
          usersToCleanup.push(userId);
        }
      }
    });

    // Remove users with no active connections
    if (usersToCleanup.length > 0) {
      usersToCleanup.forEach(userId => {
        this.connections.delete(userId);
        console.log(`[SOCIAL] Broadcast cleanup: User ${userId} removed (no active connections)`);
      });
    }
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

  /**
   * Perform health check and cleanup of dead connections
   * This should be called periodically to ensure connection map stays clean
   */
  performHealthCheck(): void {
    const usersToCleanup: string[] = [];
    let totalDeadSockets = 0;

    this.connections.forEach((sockets, userId) => {
      const deadSockets: SocketStream[] = [];

      sockets.forEach(socket => {
        if (socket.readyState !== socket.OPEN) {
          deadSockets.push(socket);
        }
      });

      if (deadSockets.length > 0) {
        totalDeadSockets += deadSockets.length;
        deadSockets.forEach(socket => {
          sockets.delete(socket);
          this.socketToUser.delete(socket);
        });

        if (sockets.size === 0) {
          usersToCleanup.push(userId);
        }
      }
    });

    // Remove users with no active connections
    usersToCleanup.forEach(userId => {
      this.connections.delete(userId);
    });

    if (totalDeadSockets > 0 || usersToCleanup.length > 0) {
      console.log(`[SOCIAL] Health check: Cleaned up ${totalDeadSockets} dead socket(s), removed ${usersToCleanup.length} user(s) with no connections`);
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(intervalMs: number = 30000): NodeJS.Timeout {
    console.log(`[SOCIAL] Starting periodic health checks every ${intervalMs}ms`);
    return setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager();
