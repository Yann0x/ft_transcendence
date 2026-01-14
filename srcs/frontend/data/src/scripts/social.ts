import { Friends } from './friends';
import { Chat } from './chat';
import { App } from './app';
import { Router } from './router';
import { socialClient } from './social-client';

// Wrap Chat and Friend modules
export const Social = {

    async init() {
        const token = sessionStorage.getItem('authToken');
        if (!App.me || !token) {
            alert('You must login to access this page');
            Router.navigate('home');
            return;
        }
        
        Friends.setupSocialEventListeners();
        Chat.setupSocialEventListeners();

        socialClient.connect(token);

        Friends.setupSearchListeners();

        console.log('[SOCIAL] Social page initialized successfully');
    },

    async load() {
        Friends.display();
        await Chat.displayChannels();
        await Chat.openLastConversation();
    },

    cleanup() {
    }
};
