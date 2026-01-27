/* CONNEXION MANAGER */

import { UserPublic, SocialEvent } from './shared/with_front/types'
import { WebSocket } from '@fastify/websocket';
import customFetch from './shared/utils/fetch';

/* TYPES */

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

interface TournamentInvitation {
    invitationId: string;
    tournamentId: string;
    tournamentName?: string;
    inviterId: string;
    invitedId: string;
    channelId: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    expiresAt: Date;
    createdAt: Date;
    messageId: number;
    expirationTimer?: NodeJS.Timeout;
}

/* MANAGER */

export const connexionManager = {
    connected: new Map<UserPublic.id, ConnectedUser>(),
    invitations: new Map<string, GameInvitation>(),
    tournamentInvitations: new Map<string, TournamentInvitation>(),

    /* CONNEXIONS */

    /* Ajoute un utilisateur connecté */
    addConnected(user: UserPublic, socket: WebSocket) {
       console.log(`[SOCIAL] Add ${user.id} to connected users`)
       this.connected.set(user.id!, { user, socket })
    },

    /* Supprime un utilisateur connecté */
    removeConnected(user_id: UserPublic.id) {
       console.log(`[SOCIAL] Delete ${user_id} of connected users`)
        this.connected.delete(user_id)
    },

    /* Retourne le nombre d'utilisateurs connectés */
    getCount() {
        return this.connected.size;
    },

    /* Retourne les IDs de tous les utilisateurs connectés */
    getAllConnectedUserIds(): string[] {
        return Array.from(this.connected.keys());
    },

    /* Retourne tous les utilisateurs connectés */
    getAllConnectedUsers(): UserPublic[] {
        return Array.from(this.connected.values()).map(c => c.user);
    },

    /* Vérifie si un utilisateur est connecté */
    isUserConnected(user_id: UserPublic.id): boolean {
        return this.connected.has(user_id);
    },

    /* MESSAGING */

    /* Envoie un événement à un utilisateur */
    sendToUser(user_id: UserPublic.id, event: any) {
       console.log(`[SOCIAL] Send to ${user_id} : ${event}`)
        const connectedUser = this.connected.get(user_id);
        if (connectedUser && connectedUser.socket.readyState === connectedUser.socket.OPEN) {
            connectedUser.socket.send(JSON.stringify(event));
        }
    },

    /* Envoie un événement à tous les utilisateurs connectés */
    async sendToAll(event: SocialEvent, subjectUserId?: string) {
        let excludeUserIds: string[] = [];

        if (subjectUserId) {
            try {
                const blockedBySubject = await customFetch(`http://user:3000/user/${subjectUserId}/blocked-users`, 'GET') as string[] || [];
                const allConnectedIds = this.getAllConnectedUserIds();
                const whoBlockedSubject: string[] = [];

                for (const userId of allConnectedIds) {
                    try {
                        const theirBlockedUsers = await customFetch(`http://user:3000/user/${userId}/blocked-users`, 'GET') as string[] || [];
                        if (theirBlockedUsers.includes(subjectUserId)) {
                            whoBlockedSubject.push(userId);
                        }
                    } catch (error) {
                    }
                }

                excludeUserIds = [...new Set([...blockedBySubject, ...whoBlockedSubject])];
                console.log(`[CONNEXION_MANAGER] Symmetric blocking: excluding ${excludeUserIds.length} users for ${subjectUserId}`);
            } catch (error) {
                console.error('[CONNEXION_MANAGER] Error fetching blocked users:', error);
            }
        }

        console.log(`[SOCIAL] Send to all : ${event}`)
        this.connected.forEach((connectedUser, userId) => {
            if (excludeUserIds.includes(userId)) {
                return;
            }

            if (connectedUser.socket.readyState === connectedUser.socket.OPEN) {
                connectedUser.socket.send(JSON.stringify(event));
            }
        })
    },

    /* GAME INVITATIONS */

    /* Récupère une invitation de jeu */
    getInvitation(invitationId: string): GameInvitation | undefined {
        return this.invitations.get(invitationId);
    },

    /* Crée une invitation de jeu */
    createInvitation(invitationId: string, inviterId: string, invitedId: string,
                     channelId: string, messageId: number): GameInvitation {
        const invitation: GameInvitation = {
            invitationId,
            inviterId,
            invitedId,
            channelId,
            status: 'pending',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            createdAt: new Date(),
            messageId
        };

        const timer = setTimeout(async () => {
            await this.expireInvitation(invitationId);
        }, 5 * 60 * 1000);

        invitation.expirationTimer = timer;
        this.invitations.set(invitationId, invitation);
        console.log(`[CONNEXION_MANAGER] Created invitation ${invitationId}`);
        return invitation;
    },

    /* Expire une invitation de jeu */
    async expireInvitation(invitationId: string): Promise<void> {
        const invitation = this.invitations.get(invitationId);
        if (!invitation || invitation.status !== 'pending') return;

        console.log(`[CONNEXION_MANAGER] Expiring invitation ${invitationId}`);
        invitation.status = 'expired';
        if (invitation.expirationTimer) {
            clearTimeout(invitation.expirationTimer);
        }

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

    /* Accepte une invitation de jeu */
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

    /* Refuse une invitation de jeu */
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

    /* Vérifie s'il existe une invitation active dans un canal */
    hasActiveInvitationInChannel(channelId: string): boolean {
        for (const invitation of this.invitations.values()) {
            if (invitation.channelId === channelId && invitation.status === 'pending') {
                return true;
            }
        }
        return false;
    },

    /* TOURNAMENT INVITATIONS */

    /* Récupère une invitation de tournoi */
    getTournamentInvitation(invitationId: string): TournamentInvitation | undefined {
        return this.tournamentInvitations.get(invitationId);
    },

    /* Crée une invitation de tournoi */
    createTournamentInvitation(
        invitationId: string,
        inviterId: string,
        invitedId: string,
        tournamentId: string,
        channelId: string,
        messageId: number,
        tournamentName?: string
    ): TournamentInvitation {
        const invitation: TournamentInvitation = {
            invitationId,
            tournamentId,
            tournamentName,
            inviterId,
            invitedId,
            channelId,
            status: 'pending',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            createdAt: new Date(),
            messageId
        };

        const timer = setTimeout(async () => {
            await this.expireTournamentInvitation(invitationId);
        }, 10 * 60 * 1000);

        invitation.expirationTimer = timer;
        this.tournamentInvitations.set(invitationId, invitation);
        console.log(`[CONNEXION_MANAGER] Created tournament invitation ${invitationId}`);
        return invitation;
    },

    /* Expire une invitation de tournoi */
    async expireTournamentInvitation(invitationId: string): Promise<void> {
        const invitation = this.tournamentInvitations.get(invitationId);
        if (!invitation || invitation.status !== 'pending') return;

        console.log(`[CONNEXION_MANAGER] Expiring tournament invitation ${invitationId}`);
        invitation.status = 'expired';
        if (invitation.expirationTimer) {
            clearTimeout(invitation.expirationTimer);
        }

        try {
            await customFetch('http://database:3000/database/message', 'PUT', {
                id: invitation.messageId,
                metadata: JSON.stringify({
                    invitationId,
                    tournamentId: invitation.tournamentId,
                    tournamentName: invitation.tournamentName,
                    inviterId: invitation.inviterId,
                    invitedId: invitation.invitedId,
                    status: 'expired'
                })
            });
        } catch (error) {
            console.error('[CONNEXION_MANAGER] Error updating expired tournament invitation:', error);
        }
    },

    /* Met à jour le statut d'une invitation de tournoi */
    updateTournamentInvitationStatus(invitationId: string, status: 'accepted' | 'declined'): void {
        const invitation = this.tournamentInvitations.get(invitationId);
        if (!invitation) return;

        console.log(`[CONNEXION_MANAGER] Updating tournament invitation ${invitationId} to ${status}`);
        invitation.status = status;
        if (invitation.expirationTimer) {
            clearTimeout(invitation.expirationTimer);
        }
    },
}
