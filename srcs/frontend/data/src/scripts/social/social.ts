import { Friends } from './friends';
import { Chat } from './chat';
import { App } from '../app';
import { Router } from '../router';
import { socialClient } from './social-client';
import {UserPublic, SocialEvent} from '../shared/types'

export const Social = {

    async init() {
        const token = sessionStorage.getItem('authToken');
        if (!App.me || !token) {
            alert('You must login to access this page');
            Router.navigate('home');
            return;
        }

        await App.loadFriends();
        await App.loadBlockedUsers();
        await Chat.loadChannels();

        this.setupSocketListeners();

        socialClient.connect(token);
        this.display();
    },

    async load() {
        await Friends.display();
        await Chat.display();
    },

    async display(): Promise <void>
    {
       if ( Router.getPage() !== 'social_hub' ) {
        return;
       }
        Friends.display();
        Chat.display();
    },

    setupSocketListeners(): void {
        socialClient.on('users_online', (event: SocialEvent) => {
            if (event.data && event.data.users ) {
                event.data.users.forEach((user: UserPublic) => {
                    App.addToOnlineUsersMap(user);
                });
                this.display();
                // Update chat header if viewing a private channel (for duel button)
                if (Chat.currentChannel?.type === 'private') {
                    Chat.updateChatHeader(Chat.currentChannel);
                }
            }
        });
        socialClient.on('user_online', (event: SocialEvent) => {
            if (event.data && event.data.user) {
                const user = event.data.user as UserPublic;
                if (user.id && App.isUserBlocked(user.id)) return;
                App.addToOnlineUsersMap(user);
                this.display();
                // Update chat header if this user is in the current private chat (for duel button)
                if (Chat.currentChannel?.type === 'private') {
                    const otherUserId = Chat.currentChannel.members.find(
                        (id: string) => String(id) !== String(App.me?.id)
                    );
                    if (otherUserId === user.id) {
                        Chat.updateChatHeader(Chat.currentChannel);
                    }
                }
            }
        });
        socialClient.on('user_offline', (event: SocialEvent) => {
            if (event.data && event.data.id) {
                const offlineUserId = event.data.id as string;
                App.removeFromOnlineUsersMap(offlineUserId);
                this.display();
                // Update chat header if this user is in the current private chat (for duel button)
                if (Chat.currentChannel?.type === 'private') {
                    const otherUserId = Chat.currentChannel.members.find(
                        (id: string) => String(id) !== String(App.me?.id)
                    );
                    if (otherUserId === offlineUserId) {
                        Chat.updateChatHeader(Chat.currentChannel);
                    }
                }
            }
        });
        socialClient.on('user_update', async (event: SocialEvent) => {
            if (!event.data || !event.data.userId) {
                return;
            }
            await App.refreshUserData(event.data.userId);
            this.display();
        });

        socialClient.on('channel_update', (event: SocialEvent) => {
            Chat.updateChannel(event.data);
            this.display();
        });
        socialClient.on('message_new', (event: SocialEvent) => {
            Chat.addMessageToChannel(event.data);
            this.display();
        });

        socialClient.on('friend_add', (event: SocialEvent) => {
            if (event.data && event.data.friend) {
                App.addToFriendsMap(event.data.friend as UserPublic);
                this.display();
            }
        });

        socialClient.on('friend_remove', (event: SocialEvent) => {
            if (event.data && event.data.friendId) {
                App.removeFromFriendsMap(event.data.friendId as string);
                this.display();
            }
        });

        // Game invitation events
        socialClient.on('game_invitation_update', (event: SocialEvent) => {
            const { invitationId, status, gameRoomId, inviterId } = event.data;

            // Update the invitation status in the cached message
            Chat.updateInvitationStatus(invitationId, status, gameRoomId);

            // Re-render channel to update invitation card
            if (Chat.currentChannel) {
                Chat.displayChannel(Chat.currentChannel.id);
            }

            // If accepted and we're the inviter (not the one who accepted), prompt to join
            if (status === 'accepted' && gameRoomId && inviterId === App.me?.id) {
                // Find the opponent's name from the cached messages
                let opponentName: string | undefined;
                for (const channel of Chat.cachedChannelsMap.values()) {
                    for (const message of channel.messages) {
                        if (message.type === 'game_invitation' && message.metadata) {
                            const metadata = typeof message.metadata === 'string' 
                                ? JSON.parse(message.metadata) 
                                : message.metadata;
                            if (metadata.invitationId === invitationId && metadata.invitedId) {
                                const invitedUser = App.cachedUsers.get(metadata.invitedId);
                                opponentName = invitedUser?.name;
                                break;
                            }
                        }
                    }
                    if (opponentName) break;
                }

                const shouldJoin = confirm('Your invitation was accepted! Join the game now?');
                if (shouldJoin) {
                    sessionStorage.setItem('game_invitation', JSON.stringify({
                        invitationId,
                        gameRoomId,
                        opponentName
                    }));
                    Router.navigate('/game');
                }
            }
        });

        socialClient.on('game_result_update', (event: SocialEvent) => {
            const { invitationId, winnerId, loserId, score1, score2 } = event.data;

            // Update the cached message from invitation to result
            Chat.updateToGameResult(invitationId, winnerId, loserId, score1, score2);

            // Re-render to show result card
            if (Chat.currentChannel) {
                Chat.displayChannel(Chat.currentChannel.id);
            }
        });
    }
};
