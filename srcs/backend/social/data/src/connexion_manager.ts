import {UserPublic, SocialEvent}  from './shared/with_front/types'
import { WebSocket } from '@fastify/websocket';
import customFetch from './shared/utils/fetch';

interface ConnectedUser {
    user: UserPublic;
    socket: WebSocket;
}

export const connexionManager = {
    connected: new Map<UserPublic.id, ConnectedUser>(),


    addConnected(user: UserPublic, socket: WebSocket)
    {
       console.log(`[SOCIAL] Add ${user.id} to connected users`)
       this.connected.set(user.id!, { user, socket })
    },

    removeConnected(user_id: UserPublic.id)
    {
       console.log(`[SOCIAL] Delete ${user_id} of connected users`)
        this.connected.delete(user_id)
    },

    getCount () {
        return this.connected.size;
    },

    getAllConnectedUserIds(): string[] {
        return Array.from(this.connected.keys());
    },

    getAllConnectedUsers(): UserPublic[] {
        return Array.from(this.connected.values()).map(c => c.user);
    },

    sendToUser(user_id: UserPublic.id, event: any) {
       console.log(`[SOCIAL] Send to ${user_id} : ${event}`)
        const connectedUser = this.connected.get(user_id);
        if (connectedUser && connectedUser.socket.readyState === connectedUser.socket.OPEN) {
            connectedUser.socket.send(JSON.stringify(event));
        }
    },
    async sendToAll(event: SocialEvent, subjectUserId?: string) {
        let excludeUserIds: string[] = [];

        // If subjectUserId provided, fetch bidirectional blocking (symmetric)
        if (subjectUserId) {
            try {
                // Get users blocked BY subject (subject blocked them)
                const blockedBySubject = await customFetch(`http://user:3000/user/${subjectUserId}/blocked-users`, 'GET') as string[] || [];

                // Get users who blocked subject (they blocked subject)
                const allConnectedIds = this.getAllConnectedUserIds();
                const whoBlockedSubject: string[] = [];

                for (const userId of allConnectedIds) {
                    try {
                        const theirBlockedUsers = await customFetch(`http://user:3000/user/${userId}/blocked-users`, 'GET') as string[] || [];
                        if (theirBlockedUsers.includes(subjectUserId)) {
                            whoBlockedSubject.push(userId);
                        }
                    } catch (error) {
                        // Skip this user if we can't fetch their blocked list
                    }
                }

                // Combine both lists for symmetric blocking
                excludeUserIds = [...new Set([...blockedBySubject, ...whoBlockedSubject])];
                console.log(`[CONNEXION_MANAGER] Symmetric blocking: excluding ${excludeUserIds.length} users for ${subjectUserId}`);
            } catch (error) {
                console.error('[CONNEXION_MANAGER] Error fetching blocked users:', error);
                // Fail open - continue without filtering
            }
        }

        console.log(`[SOCIAL] Send to all : ${event}`)
        this.connected.forEach((connectedUser, userId) => {
            // Skip users in the blocked list (symmetric)
            if (excludeUserIds.includes(userId)) {
                return;
            }

            if (connectedUser.socket.readyState === connectedUser.socket.OPEN) {
                connectedUser.socket.send(JSON.stringify(event));
            }
        })
    },
}
