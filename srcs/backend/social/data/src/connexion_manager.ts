import {UserPublic, SocialEvent}  from './shared/with_front/types'
import { WebSocket } from '@fastify/websocket';
import customFetch from './shared/utils/fetch';

interface ConnectedUser {
    user: UserPublic;
    socket: WebSocket;
}

interface GameInvitation {
    invitationId: string;
    inviterId: string;
    invitedId: string;
    channelId: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    gameRoomId?: string;
    expiresAt: Date;
    createdAt: Date;
    messageId: number;
    expirationTimer?: NodeJS.Timeout;
}

export const connexionManager = {
    connected: new Map<UserPublic.id, ConnectedUser>(),
    invitations: new Map<string, GameInvitation>(),

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

    isUserConnected(user_id: UserPublic.id): boolean {
        return this.connected.has(user_id);
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

    // Game invitation management methods
    getInvitation(invitationId: string): GameInvitation | undefined {
        return this.invitations.get(invitationId);
    },

    createInvitation(invitationId: string, inviterId: string, invitedId: string,
                     channelId: string, messageId: number): GameInvitation {
        const invitation: GameInvitation = {
            invitationId,
            inviterId,
            invitedId,
            channelId,
            status: 'pending',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
            createdAt: new Date(),
            messageId
        };

        // Set auto-expiration timer
        const timer = setTimeout(async () => {
            await this.expireInvitation(invitationId);
        }, 5 * 60 * 1000);

        invitation.expirationTimer = timer;
        this.invitations.set(invitationId, invitation);
        console.log(`[CONNEXION_MANAGER] Created invitation ${invitationId}`);
        return invitation;
    },

    async expireInvitation(invitationId: string): Promise<void> {
        const invitation = this.invitations.get(invitationId);
        if (!invitation || invitation.status !== 'pending') return;

        console.log(`[CONNEXION_MANAGER] Expiring invitation ${invitationId}`);
        invitation.status = 'expired';
        if (invitation.expirationTimer) {
            clearTimeout(invitation.expirationTimer);
        }

        // Update database
        try {
            await customFetch('http://database:3000/database/game_invitation', 'PUT', {
                id: invitationId,
                status: 'expired'
            });

            await customFetch('http://database:3000/database/message', 'PUT', {
                id: invitation.messageId,
                metadata: JSON.stringify({ ...invitation, status: 'expired' })
            });
        } catch (error) {
            console.error('[CONNEXION_MANAGER] Error updating expired invitation:', error);
        }
    },

    acceptInvitation(invitationId: string, gameRoomId: string): GameInvitation | null {
        const invitation = this.invitations.get(invitationId);
        if (!invitation) return null;

        console.log(`[CONNEXION_MANAGER] Accepting invitation ${invitationId}`);
        invitation.status = 'accepted';
        invitation.gameRoomId = gameRoomId;
        if (invitation.expirationTimer) {
            clearTimeout(invitation.expirationTimer);
        }

        return invitation;
    },

    declineInvitation(invitationId: string): GameInvitation | null {
        const invitation = this.invitations.get(invitationId);
        if (!invitation) return null;

        console.log(`[CONNEXION_MANAGER] Declining invitation ${invitationId}`);
        invitation.status = 'declined';
        if (invitation.expirationTimer) {
            clearTimeout(invitation.expirationTimer);
        }

        return invitation;
    },

    hasActiveInvitationInChannel(channelId: string): boolean {
        for (const invitation of this.invitations.values()) {
            if (invitation.channelId === channelId && invitation.status === 'pending') {
                return true;
            }
        }
        return false;
    },
}
