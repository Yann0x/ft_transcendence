/* SOCIAL */

import { Friends } from './friends';
import { Chat } from './chat';
import { App } from '../app';
import { Router } from '../router';
import { socialClient } from './social-client';
import { UserPublic, SocialEvent } from '../shared/types'

/* SOCIAL MODULE */

export const Social = {

  /* CONNECT */

  async connect() {
    const token = sessionStorage.getItem('authToken');
    if (!App.me || !token) {
      return;
    }

    await App.loadFriends();
    await App.loadBlockedUsers();
    await Chat.loadChannels();

    this.setupSocketListeners();
    socialClient.connect(token);

    Chat.updateNavbarBadge();
  },

  /* INIT */

  async init() {
    const token = sessionStorage.getItem('authToken');
    const loginRequired = document.getElementById('social-login-required');
    const socialContent = document.getElementById('social-content');

    if (!App.me || !token) {
      loginRequired?.classList.remove('hidden');
      socialContent?.classList.add('hidden');
      return;
    }

    loginRequired?.classList.add('hidden');
    socialContent?.classList.remove('hidden');

    if (!socialClient.isConnected()) {
      await this.connect();
    }

    this.display();
  },

  /* DISPLAY */

  async display(): Promise<void> {
    Chat.updateNavbarBadge();

    if (Router.getPage() !== 'social_hub') {
      return;
    }
    Friends.display();
    Chat.display();
  },

  /* SOCKET LISTENERS */

  setupSocketListeners(): void {
    socialClient.on('users_online', (event: SocialEvent) => {
      if (event.data && event.data.users) {
        event.data.users.forEach((user: UserPublic) => {
          App.addToOnlineUsersMap(user);
        });
        this.display();
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

    /* GAME INVITATION EVENTS */

    socialClient.on('game_invitation_update', (event: SocialEvent) => {
      const { invitationId, status, gameRoomId, inviterId } = event.data;

      Chat.updateInvitationStatus(invitationId, status, gameRoomId);

      if (Chat.currentChannel) {
        Chat.displayChannel(Chat.currentChannel.id);
      }

      if (status === 'accepted' && gameRoomId && inviterId === App.me?.id) {
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

      Chat.updateToGameResult(invitationId, winnerId, loserId, score1, score2);

      if (Chat.currentChannel) {
        Chat.displayChannel(Chat.currentChannel.id);
      }
    });

    /* TOURNAMENT INVITATION EVENTS */

    socialClient.on('tournament_invitation_update', (event: SocialEvent) => {
      const { invitationId, status, tournamentId } = event.data;

      Chat.updateTournamentInvitationStatus(invitationId, status);

      if (Chat.currentChannel) {
        Chat.displayChannel(Chat.currentChannel.id);
      }

      if (status === 'accepted' && event.data.inviterId === App.me?.id) {
        console.log('[SOCIAL] Tournament invitation accepted, friend joined tournament:', tournamentId);
      }
    });

    socialClient.on('tournament_card_update', (event: SocialEvent) => {
      const { invitationId, tournamentStatus, matchReady, winnerName } = event.data;

      Chat.updateTournamentCardStatus(invitationId, event.data);

      if (Chat.currentChannel) {
        Chat.displayChannel(Chat.currentChannel.id);
      }

      if (matchReady && event.data.invitedId === App.me?.id) {
        console.log('[SOCIAL] Your tournament match is ready!');
      }

      if (tournamentStatus === 'finished' && winnerName) {
        console.log('[SOCIAL] Tournament finished! Winner:', winnerName);
      }
    });
  }
};
