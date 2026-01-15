import { Friends } from './friends';
import { Chat } from './chat';
import { App } from './app';
import { Router } from './router';
import { socialClient } from './social-client';
import {UserPublic, SocialEvent} from '../shared/types'

// Wrap Chat and Friend modules
export const Social = {

    async init() {
        const token = sessionStorage.getItem('authToken');
        if (!App.me || !token) {
            alert('You must login to access this page');
            Router.navigate('home');
            return;
        }
        
        this.setupSocketListeners();

        socialClient.connect(token);

        Friends.setupSearchListeners();

        console.log('[SOCIAL] Social page initialized successfully');
    },

    async load() {
        Friends.display();
        await Chat.displayChannels();

        // Check for pending channel from profile modal message action
        const pendingChannelId = sessionStorage.getItem('pendingChannelId');
        if (pendingChannelId) {
            sessionStorage.removeItem('pendingChannelId');
            await Chat.loadAndDisplayChannel(pendingChannelId);
        } else {
            await Chat.openLastConversation();
        }
    },

    setupSocketListeners(): void {
        socialClient.on('users_online', (event: SocialEvent) => {
            console.log('[SOCIAL] Received online users list:', event.data);
            if (event.data && event.data.users ) {
                event.data.users.forEach((user: UserPublic) => {
                    App.addToOnlineUsersMap(user);
                })
            }
        });
        socialClient.on('user_online', (event: SocialEvent) => {
            console.log('[SOCIAL] User came online:', event.data);
            if (event.data && event.data.user) {
                const user = event.data.user as UserPublic;
                if (user.id && App.isUserBlocked(user.id)) return;
                    App.addToOnlineUsersMap(user);
            }
        });
        socialClient.on('user_offline', (event: SocialEvent) => {
            console.log('[SOCIAL] User went offline:', event.data);
            if (event.data && event.data.id) {
                const userId = event.data.id as string;
                App.removeFromOnlineUsersMap(userId);
            }
        });
        socialClient.on('user_update', async (event: SocialEvent) => {
            console.log('[SOCIAL] User update event received:', event.data);
            if (!event.data || !event.data.userId) {
                console.warn('[SOCIAL] Invalid user_update event data');
                return;
            }
            await App.refreshUserData(event.data.userId);
            return;
        });

        socialClient.on('channel_update', (event: SocialEvent) => {
            Chat.updateChannel(event.data);
        });
        socialClient.on('message_new', (event: SocialEvent) => {
            Chat.addMessageToChannel(event.data);
        });
    },



    cleanup() {
    }
};
