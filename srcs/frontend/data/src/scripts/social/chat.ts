import {App} from '../app.ts'
import {Message, Channel, SocialEvent, UserPublic, GameInvitationData, GameResultData, TournamentInvitationData} from '../shared/types'
import {ProfileModal} from '../profile-modal.ts'
import {Router} from '../router.ts'
import * as SocialCommands from './social-commands';

export const Chat =
{
  cachedChannelsMap: new Map <string, Channel>(),
  sortedChanelsArray: new Array<Channel>,
  currentChannel: null as Channel | null, 

    async loadChannels() {
        const token = sessionStorage.getItem('authToken');
        try {
            const response = await fetch('/user/channels', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                console.error('[SOCIAL] Failed to load channels');
                return;
            }
            const channels = await response.json();

            this.cachedChannelsMap.clear();

            for (const channel of channels) {
                // Normalize messages to ensure proper type handling
                if (channel.messages) {
                    channel.messages = channel.messages.map((msg: Message) => this.normalizeMessage(msg));
                }
                this.updateChannel(channel);
                if (channel.members) {
                    const membersToFetch = channel.members.filter(m => !App.cachedUsers.has(m.id));
                    if (membersToFetch.length > 0)
                        await App.fetchAndCacheUsers(Array.from(membersToFetch));
                }
            }
        } catch (error) {
            console.error('[SOCIAL] Error loading channels:', error);
        }
    },

    // Normalize message to ensure consistent type and metadata handling
    normalizeMessage(message: Message): Message {
        // Parse metadata if it's a string
        if (message.metadata && typeof message.metadata === 'string') {
            try {
                message.metadata = JSON.parse(message.metadata);
            } catch (e) {
                console.warn('[CHAT] Failed to parse message metadata:', e);
            }
        }
        
        // Infer message type from metadata if not set correctly
        if (message.metadata) {
            const metadata = message.metadata as any;
            if (metadata.tournamentId && metadata.inviterId && !metadata.winnerId) {
                // This is a tournament invitation
                if (message.type !== 'tournament_invitation') {
                    console.log('[CHAT] Fixing message type to tournament_invitation:', message.id);
                    message.type = 'tournament_invitation';
                }
            } else if (metadata.invitationId && metadata.inviterId && !metadata.winnerId && !metadata.tournamentId) {
                // This is a game invitation
                if (message.type !== 'game_invitation') {
                    console.log('[CHAT] Fixing message type to game_invitation:', message.id);
                    message.type = 'game_invitation';
                }
            } else if (metadata.winnerId && metadata.loserId) {
                // This is a game result
                if (message.type !== 'game_result') {
                    console.log('[CHAT] Fixing message type to game_result:', message.id);
                    message.type = 'game_result';
                }
            }
        }
        
        return message;
    },

    updateInvitationStatus(invitationId: string, status: string, gameRoomId?: string): void {
        // Find and update the message with this invitation in all channels
        for (const channel of this.cachedChannelsMap.values()) {
            for (const message of channel.messages) {
                if (message.type === 'game_invitation' && message.metadata) {
                    const metadata = typeof message.metadata === 'string' 
                        ? JSON.parse(message.metadata) 
                        : message.metadata;
                    
                    if (metadata.invitationId === invitationId) {
                        metadata.status = status;
                        if (gameRoomId) {
                            metadata.gameRoomId = gameRoomId;
                        }
                        message.metadata = metadata;
                        console.log(`[CHAT] Updated invitation ${invitationId} status to ${status}`);
                        return;
                    }
                }
            }
        }
    },

    updateToGameResult(invitationId: string, winnerId: string, loserId: string, score1: number, score2: number): void {
        // Find and update the invitation message to a game result
        for (const channel of this.cachedChannelsMap.values()) {
            for (const message of channel.messages) {
                if (message.type === 'game_invitation' && message.metadata) {
                    const metadata = typeof message.metadata === 'string' 
                        ? JSON.parse(message.metadata) 
                        : message.metadata;
                    
                    if (metadata.invitationId === invitationId) {
                        // Convert to game result
                        message.type = 'game_result';
                        message.metadata = {
                            invitationId,
                            winnerId,
                            loserId,
                            score1,
                            score2,
                            completedAt: new Date().toISOString()
                        };
                        console.log(`[CHAT] Updated invitation ${invitationId} to game result`);
                        return;
                    }
                }
            }
        }
    },

    updateTournamentInvitationStatus(invitationId: string, status: string): void {
        // Find and update the tournament invitation message in all channels
        for (const channel of this.cachedChannelsMap.values()) {
            for (const message of channel.messages) {
                if (message.type === 'tournament_invitation' && message.metadata) {
                    const metadata = typeof message.metadata === 'string' 
                        ? JSON.parse(message.metadata) 
                        : message.metadata;
                    
                    if (metadata.invitationId === invitationId) {
                        metadata.status = status;
                        message.metadata = metadata;
                        console.log(`[CHAT] Updated tournament invitation ${invitationId} status to ${status}`);
                        return;
                    }
                }
            }
        }
    },

    getChannelLatestDate(channel: Channel): number {
        const lastMsg = channel.messages.at(-1);
        const lastMsgDate = lastMsg ? new Date(lastMsg.sent_at).getTime() : 0;
        const channelDate = channel.created_at ? new Date(channel.created_at).getTime() : 0;
        return Math.max(lastMsgDate, channelDate);
    },

    sortChannels()
    {
        this.sortedChanelsArray = Array.from(this.cachedChannelsMap.values());
        this.sortedChanelsArray.sort((a: Channel, b: Channel) => 
            this.getChannelLatestDate(b) - this.getChannelLatestDate(a)
        )
    },

    addMessageToChannel(message: Message)
    {
        if (!message.channel_id) return;
        const channel = this.cachedChannelsMap.get(message.channel_id);
        if (!channel) {
            return;
        }
        // Prevent duplicate messages
        if (channel.messages.some((m: Message) => m.id === message.id)) {
            return;
        }
        // Normalize the message before adding
        const normalizedMessage = this.normalizeMessage(message);
        channel.messages.push(normalizedMessage);
        this.displayChannels();

        // If this is the currently open channel, re-render messages to show the new message
        if (this.currentChannel && this.currentChannel.id === message.channel_id) {
            this.displayMessages(this.currentChannel);
        }
    },

    updateChannel(channel: Channel){
        const oldOne = this.cachedChannelsMap.get(channel.id);
        if (oldOne) {
            Object.assign(oldOne, channel);
        } else {
            this.cachedChannelsMap.set(channel.id, channel);
        }
    },

    hasUnreadMessages(channel: Channel): boolean {
        return channel.messages.some((msg: Message) =>
            msg.read_at === null && msg.sender_id !== App.me.id
        );
    },

    updateNavbarBadge() {
        const badge = document.getElementById('chat-unread-badge');
        if (!badge) return;

        const isOnSocialPage = Router.getPage() === 'social_hub';
        if (isOnSocialPage) {
            badge.classList.add('hidden');
            badge.classList.remove('flex');
            return;
        }

        let totalUnread = 0;
        if (this.sortedChanelsArray) {
            this.sortedChanelsArray.forEach((channel: Channel) => {
                const unreadCount = channel.messages.filter((msg: Message) =>
                    msg.read_at === null && msg.sender_id !== App.me.id
                ).length;
                totalUnread += unreadCount;
            });
        }
        if (totalUnread > 0) {
            badge.textContent = String(totalUnread);
            badge.classList.remove('hidden');
            badge.classList.add('flex');
        } else {
            badge.classList.add('hidden');
            badge.classList.remove('flex');
        }
    },

    attachChannelListeners(): void
    {
        document.querySelectorAll('.channel').forEach(card => {
            card.addEventListener('click', async(e) => {
                const channel_id = (e.currentTarget as HTMLElement).getAttribute('data-channel-id');
                if  (channel_id) {
                    await this.displayChannel(channel_id);
                }
            })
        })
        document.querySelectorAll('.channel-avatar').forEach(avatar => {
            avatar.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = (e.currentTarget as HTMLElement).dataset.userId;
                if (userId) {
                    ProfileModal.open(userId);
                }
            });
        });
    },

    attachMessageFormListener(): void
    {
        const form = document.getElementById('message-form');
        form?.addEventListener('submit', (e) => this.handleSendMessage(e));

        // Attach invitation button listeners
        document.querySelectorAll('.invitation-accept').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const invitationId = (e.target as HTMLElement).dataset.invitationId;
                if (invitationId) await this.handleAcceptInvitation(invitationId);
            });
        });

        document.querySelectorAll('.invitation-decline').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const invitationId = (e.target as HTMLElement).dataset.invitationId;
                if (invitationId) await this.handleDeclineInvitation(invitationId);
            });
        });

        // Attach tournament invitation button listeners
        document.querySelectorAll('.tournament-invitation-accept').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const invitationId = (e.target as HTMLElement).dataset.invitationId;
                if (invitationId) await this.handleAcceptTournamentInvitation(invitationId);
            });
        });

        document.querySelectorAll('.tournament-invitation-decline').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const invitationId = (e.target as HTMLElement).dataset.invitationId;
                if (invitationId) await this.handleDeclineTournamentInvitation(invitationId);
            });
        });
    },

    attachChatHeaderListeners(): void
    {
        const profileBtn = document.querySelector('#chat-header-actions button[title="View profile"]');
        const otherUserId = this.currentChannel?.members.find((id: string) => String(id) !== String(App.me?.id));
        if (profileBtn && otherUserId){
            profileBtn.addEventListener('click', () => {
                ProfileModal.open(otherUserId);
            });
        }
    },

    async display(): Promise <void>
    {
        await this.displayChannels();
        this.updateNavbarBadge();
    },

    async displayChannels()
    {
        const channelsList = document.getElementById('channels-list');
        if (!channelsList) {
            return
        }
        this.sortChannels();
        if (this.sortedChanelsArray.length === 0) {
            channelsList.innerHTML = `
                <div class="p-8 text-center text-neutral-500 text-sm">
                    <p>Aucune conversation</p>
                    <p class="text-xs mt-2">Ajoutez des amis pour commencer à discuter!</p>
                </div>
            `;
        } else {
            channelsList.innerHTML = this.sortedChanelsArray.map((channel: Channel) => this.createChannelCard(channel)).join('');
            this.attachChannelListeners();
            this.displayChannel(this.currentChannel?.id);
        }
    },

    async displayChannel(channelId: string) {
        if (!channelId)
            return;
        const channel = this.cachedChannelsMap.get(channelId);
        this.currentChannel = channel;
        await this.checkReadStatus();
        await this.displayMessages(channel);
    },

    async checkReadStatus(): Promise <void> {
        if (!this.currentChannel)
            return;

        const isOnSocialPage = Router.getPage() === 'social_hub';
        if (!isOnSocialPage)
            return;
        const hasUnreadMessages = this.currentChannel.messages.some((msg: Message) =>
            msg.read_at === null && msg.sender_id !== App.me.id
        );
        if (hasUnreadMessages) {
            try {
                await SocialCommands.markRead(this.currentChannel.id);

                this.currentChannel.messages.forEach((msg: Message) => {
                    if (msg.sender_id !== App.me.id && msg.read_at === null) {
                        msg.read_at = new Date().toISOString();
                    }
                });

                this.updateNavbarBadge();
            } catch (error) {
                console.error('[CHAT] Failed to mark channel as read:', error);
            }
        }
    },

    async displayMessages(channel: Channel)
    {
        const messageList = document.getElementById('channel-messages');
        const messageInput = document.getElementById('message-input-container');
        if (!messageList || !messageInput)
            return;
        this.updateChatHeader(channel);
        let messagesHTML = channel.messages.map((message: Message) => this.createMessageCard(message)).join('');
        const isBlocked = (channel as any).isBlocked || false;
        
        // Remove centering classes and add flex-col for vertical message layout
        messageList.classList.remove('items-center', 'justify-center', 'flex');
        messageList.classList.add('flex', 'flex-col');
        
        messageList.innerHTML = messagesHTML;
        requestAnimationFrame(() => {
            messageList.scrollTop = messageList.scrollHeight;
        });
        if (isBlocked) {
            messageInput.innerHTML = `
                <div class="flex gap-2 p-4 bg-neutral-800 border-t border-neutral-700">
                    <input
                        type="text"
                        placeholder="This conversation has been blocked"
                        class="flex-1 px-4 py-2 bg-neutral-900 text-neutral-500 rounded-lg cursor-not-allowed"
                        disabled
                    />
                    <button
                        type="button"
                        class="px-6 py-2 bg-neutral-700 text-neutral-500 rounded-lg cursor-not-allowed"
                        disabled
                    >
                        Send
                    </button>
                </div>
            `;
        } else {
            messageInput.innerHTML = `
                <form id="message-form" class="flex gap-2 p-4 bg-neutral-800 border-t border-neutral-700">
                    <input
                        type="text"
                        id="message-content-input"
                        placeholder="Type a message..."
                        class="flex-1 px-4 py-2 bg-neutral-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        autocomplete="off"
                    />
                    <button
                        type="submit"
                        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        Send
                    </button>
                </form>
            `;

            const input = document.getElementById('message-content-input') as HTMLInputElement;
            input?.focus();

            this.attachMessageFormListener();
        }
    },

    getChannelDisplayName(channel: Channel): string {
        if (channel.type === 'private') {
            const otherUserId = channel.members.find((id: string) => String(id) !== String(App.me?.id));
            if (otherUserId) {
                const otherUser = App.cachedUsers.get(otherUserId);
                if (otherUser?.name) {
                    return otherUser.name;
                }
            }
            return channel.name || 'Private Chat';
        }
        return channel.name || 'NoName';
    },

    updateChatHeader(channel: Channel) {
        const headerName = document.getElementById('chat-header-name');
        const headerStatus = document.getElementById('chat-header-status');
        const headerAvatar = document.getElementById('chat-header-avatar');
        const headerActions = document.getElementById('chat-header-actions');

        if (!headerName || !headerStatus || !headerAvatar || !headerActions) return;

        const displayName = this.getChannelDisplayName(channel);

        headerName.textContent = displayName;

        if (channel.type === 'private') {
            const otherUserId = channel.members.find((id: string) => String(id) !== String(App.me?.id));
            const isOnline = otherUserId && App.onlineUsersMap.has(otherUserId);
            headerStatus.textContent = isOnline ? 'En ligne' : 'Hors ligne';
            headerStatus.className = isOnline
                ? 'text-xs text-green-400'
                : 'text-xs text-neutral-400';
        } else {
            headerStatus.textContent = `${channel.members.length} membres`;
            headerStatus.className = 'text-xs text-neutral-400';
        }

        if (channel.type === 'private') {
            const otherUserId = channel.members.find((id: string) => String(id) !== String(App.me?.id));
            const otherUser = otherUserId ? App.cachedUsers.get(otherUserId) : null;
            const avatarUrl = otherUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3b82f6&color=fff`;
            headerAvatar.innerHTML = `<img src="${avatarUrl}" alt="${displayName}" class="w-10 h-10 rounded-full object-cover hover:ring-2 hover:ring-blue-500 transition cursor-pointer">`;
            headerAvatar.className = 'cursor-pointer';
            headerAvatar.onclick = () => {
                if (otherUserId) ProfileModal.open(otherUserId);
            };
        } else {
            headerAvatar.innerHTML = '';
            headerAvatar.textContent = displayName.charAt(0).toUpperCase();
            headerAvatar.className = '';
            headerAvatar.onclick = null;
        }

        headerActions.classList.remove('hidden'); // Remove Tailwind hidden class
        headerActions.style.display = 'flex';
        headerActions.innerHTML = ''; // Clear existing buttons

        // Add "Invite to Play" button for online friends in private channels
        if (channel.type === 'private') {
            const otherUserId = channel.members.find((id: string) => String(id) !== String(App.me?.id));
            const isOnline = otherUserId && App.onlineUsersMap.has(otherUserId);
            const isFriend = otherUserId && App.isFriend(otherUserId);

            console.log('[CHAT] Duel button check:', {
                channelType: channel.type,
                otherUserId,
                isOnline,
                isFriend,
                onlineUsersMapKeys: Array.from(App.onlineUsersMap.keys()),
                friendsMapKeys: Array.from(App.friendsMap.keys()),
                myId: App.me?.id
            });

            if (isFriend && isOnline) {
                const inviteBtn = `
                    <button
                        id="chat-invite-game"
                        class="btn btn-sm bg-transparent text-orange-400 border border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.4)] hover:shadow-[0_0_12px_rgba(249,115,22,0.6)] hover:border-orange-400 flex items-center gap-1 transition-all"
                        title="Invite to play">
                        <span>Duel</span>
                    </button>
                `;
                headerActions.insertAdjacentHTML('beforeend', inviteBtn);

                const inviteButton = document.getElementById('chat-invite-game');
                if (inviteButton && otherUserId) {
                    inviteButton.addEventListener('click', () => {
                        this.handleInviteToGame(otherUserId);
                    });
                }
            }
        }

        this.attachChatHeaderListeners();
    },

    async handleSendMessage(e: Event)
    {
        e.preventDefault();
        const input = document.getElementById('message-content-input') as HTMLInputElement;
        const content = input?.value.trim();

        if (!this.currentChannel?.id || !content) return;

        try {
            const result = await SocialCommands.sendMessage(this.currentChannel.id, content);
            input.value = '';
            // Add the sent message to the UI from the success response
            if (result?.message) {
                this.addMessageToChannel(result.message);
            }
        } catch (error) {
            console.error('[CHAT] Error sending message:', error);
            alert('Failed to send message');
        }
    },

    createChannelCard(channel: Channel)
    {
        const displayName = this.getChannelDisplayName(channel);

        const isActive = this.currentChannel === channel;
        const hasUnread = this.hasUnreadMessages(channel);
        const unreadCount = channel.messages.filter((msg: Message) =>
            msg.read_at === null && msg.sender_id !== App.me.id
        ).length;
        let iconBgColor;
        if (isActive) {
            iconBgColor = 'bg-blue-700';
        } else if (hasUnread) {
            iconBgColor = 'bg-blue-600';
        } else {
            iconBgColor = 'bg-neutral-700';
        }

        const unreadBadge = unreadCount > 0
            ? `<span class="flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-blue-600 text-white text-xs font-bold">${unreadCount}</span>`
            : '';

        const lastMessage = channel.messages.length > 0
            ? channel.messages[channel.messages.length - 1]
            : null;
        const lastMessageText = lastMessage
            ? lastMessage.content
            : 'No messages yet';
        const lastMessagePreview = lastMessageText.length > 50
            ? lastMessageText.substring(0, 50) + '...'
            : lastMessageText;

        let avatarHtml: string;
        if (channel.type === 'private') {
            const otherUserId = channel.members.find((id: string) => String(id) !== String(App.me?.id));
            const otherUser = otherUserId ? App.cachedUsers.get(otherUserId) : null;
            const avatarUrl = otherUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3b82f6&color=fff`;
            avatarHtml = `<div class="channel-avatar cursor-pointer" data-user-id="${otherUserId}"><img src="${avatarUrl}" alt="${displayName}" class="w-12 h-12 rounded-full object-cover hover:ring-2 hover:ring-blue-500 transition"></div>`;
        } else {
            avatarHtml = `
                <div class="flex items-center justify-center w-12 h-12 rounded-full ${iconBgColor}">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                    </svg>
                </div>
            `;
        }

        const card = `
            <div class="channel flex items-center justify-between p-4 rounded-lg transition cursor-pointer" data-channel-id="${channel.id}">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    ${avatarHtml}
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-white truncate">${displayName}</p>
                        <p class="text-sm text-neutral-400 truncate">${lastMessagePreview}</p>
                    </div>
                </div>
                ${unreadBadge}
            </div>
        `;
        return card;
    },

    createMessageCard(message: Message)
    {
        // Handle special message types
        if (message.type === 'game_invitation') {
            const card = this.createInvitationCard(message);
            // If invitation card creation failed, hide the message
            if (!card) {
                return '';
            }
            return card;
        } else if (message.type === 'game_result') {
            const card = this.createResultCard(message);
            // If result card creation failed, hide the message
            if (!card) {
                return '';
            }
            return card;
        } else if (message.type === 'tournament_invitation') {
            const card = this.createTournamentInvitationCard(message);
            if (!card) {
                return '';
            }
            return card;
        }

        // Default text message
        const timestamp = new Date(message.sent_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const isRead = message.read_at !== null;
        const readStatus = isRead
            ? `<span class="text-green-500">✓✓</span>`
            : `<span class="text-neutral-500">✓</span>`;
        const isOwnMessage = message.sender_id === App.me.id;
        const bgColor = isOwnMessage ? 'bg-neutral-900' : 'bg-neutral-800';
        const card = `
            <div class="flex flex-col gap-1 p-3 ${bgColor} rounded-lg" data-message-id="${message.id}">
                <div class="text-white break-words">
                    ${message.content}
                </div>
                <div class="flex items-center gap-2 text-xs text-neutral-400">
                    <span>${timestamp}</span>
                    <span>${readStatus}</span>
                </div>
            </div>
        `;
        return card;
    },

    createInvitationCard(message: Message) {
        if (!message.metadata) {
            console.warn('[CHAT] Invitation message missing metadata:', message.id);
            return '';
        }

        let metadata: GameInvitationData;
        try {
            metadata = typeof message.metadata === 'string'
                ? JSON.parse(message.metadata) as GameInvitationData
                : message.metadata as GameInvitationData;
        } catch (e) {
            console.warn('[CHAT] Failed to parse invitation metadata:', e);
            return '';
        }

        const { invitationId, inviterId, status } = metadata;
        
        // Validate required fields
        if (!invitationId || !inviterId) {
            console.warn('[CHAT] Invitation missing required fields:', metadata);
            return '';
        }

        const inviterUser = App.cachedUsers.get(inviterId);
        const inviterName = inviterUser?.name || 'Someone';

        const isInviter = inviterId === App.me.id;
        const canRespond = !isInviter && status === 'pending';

        const timestamp = new Date(message.sent_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        let statusDisplay = '';
        let actionsHtml = '';

        switch (status) {
            case 'pending':
                if (canRespond) {
                    actionsHtml = `
                        <div class="flex gap-2 mt-3">
                            <button
                                class="invitation-accept flex-1 px-3 py-1.5 bg-neutral-700 hover:bg-green-600/20 text-green-400 border border-green-600/30 hover:border-green-500 rounded transition text-sm font-medium"
                                data-invitation-id="${invitationId}">
                                Accept
                            </button>
                            <button
                                class="invitation-decline flex-1 px-3 py-1.5 bg-neutral-700 hover:bg-red-600/20 text-red-400 border border-red-600/30 hover:border-red-500 rounded transition text-sm font-medium"
                                data-invitation-id="${invitationId}">
                                Decline
                            </button>
                        </div>
                    `;
                    statusDisplay = '<p class="text-amber-500/80 text-xs mt-1">Waiting for your response...</p>';
                } else {
                    statusDisplay = '<p class="text-neutral-400 text-xs mt-1">Waiting for response...</p>';
                }
                break;
            case 'accepted':
                statusDisplay = '<p class="text-green-500/80 text-xs mt-1">Accepted - Starting game...</p>';
                break;
            case 'declined':
                statusDisplay = '<p class="text-red-500/80 text-xs mt-1">Declined</p>';
                break;
            case 'expired':
                statusDisplay = '<p class="text-neutral-500 text-xs mt-1">Expired</p>';
                break;
        }

        return `
            <div class="invitation-card p-4 bg-neutral-800 rounded-lg border border-neutral-700"
                 data-message-id="${message.id}"
                 data-invitation-id="${invitationId}">
                <div class="flex flex-col items-center text-center gap-2">
                    <div class="w-12 h-12 bg-orange-600/20 rounded-full flex items-center justify-center">
                        <svg class="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <p class="text-white font-medium">${inviterName} challenges you to a duel!</p>
                    ${statusDisplay}
                </div>
                ${actionsHtml}
                <div class="text-xs text-neutral-500 mt-3 text-center">${timestamp}</div>
            </div>
        `;
    },

    createResultCard(message: Message) {
        if (!message.metadata) {
            console.warn('[CHAT] Result message missing metadata:', message.id);
            return '';
        }

        let metadata: GameResultData;
        try {
            metadata = typeof message.metadata === 'string'
                ? JSON.parse(message.metadata) as GameResultData
                : message.metadata as GameResultData;
        } catch (e) {
            console.warn('[CHAT] Failed to parse result metadata:', e);
            return '';
        }

        const { winnerId, loserId, score1, score2 } = metadata;
        
        // Validate required fields
        if (!winnerId || !loserId || score1 === undefined || score2 === undefined) {
            console.warn('[CHAT] Result missing required fields:', metadata);
            return '';
        }

        const winnerUser = App.cachedUsers.get(winnerId);
        const loserUser = App.cachedUsers.get(loserId);
        const winnerName = winnerUser?.name || 'Player';
        const loserName = loserUser?.name || 'Player';

        const isWinner = winnerId === App.me?.id;
        const isLoser = loserId === App.me?.id;
        
        // Result text based on outcome for current user
        let resultText: string;

        if (isWinner) {
            resultText = `You defeated ${loserName}!`;
        } else if (isLoser) {
            resultText = `${winnerName} defeated you!`;
        } else {
            resultText = `${winnerName} defeated ${loserName}!`;
        }

        const timestamp = new Date(message.sent_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="result-card p-4 bg-neutral-800 rounded-lg border border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                 data-message-id="${message.id}">
                <div class="flex flex-col items-center text-center gap-2">
                    <div class="w-12 h-12 bg-orange-600/20 rounded-full flex items-center justify-center">
                        <svg class="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <p class="text-white font-medium">Match Complete!</p>
                    <p class="text-neutral-300 text-sm">${resultText}</p>
                    <div class="flex items-center justify-center gap-6 mt-2">
                        <div class="text-center">
                            <p class="text-xl font-bold text-white">${score1}</p>
                            <p class="text-xs text-neutral-400">${winnerName}</p>
                        </div>
                        <span class="text-neutral-500">vs</span>
                        <div class="text-center">
                            <p class="text-xl font-bold text-white">${score2}</p>
                            <p class="text-xs text-neutral-400">${loserName}</p>
                        </div>
                    </div>
                </div>
                <div class="text-xs text-neutral-500 mt-3 text-center">${timestamp}</div>
            </div>
        `;
    },

    createTournamentInvitationCard(message: Message) {
        if (!message.metadata) {
            console.warn('[CHAT] Tournament invitation message missing metadata:', message.id);
            return '';
        }

        let metadata: any;
        try {
            metadata = typeof message.metadata === 'string'
                ? JSON.parse(message.metadata)
                : message.metadata;
        } catch (e) {
            console.warn('[CHAT] Failed to parse tournament invitation metadata:', e);
            return '';
        }

        const { invitationId, tournamentId, tournamentName, inviterId, inviterName, status } = metadata;
        
        // Validate required fields
        if (!invitationId || !tournamentId || !inviterId) {
            console.warn('[CHAT] Tournament invitation missing required fields:', metadata);
            return '';
        }

        const displayInviterName = inviterName || App.cachedUsers.get(inviterId)?.name || 'Someone';
        const displayTournamentName = tournamentName || `Tournament #${tournamentId.slice(-6)}`;

        const isInviter = inviterId === App.me.id;
        const canRespond = !isInviter && status === 'pending';

        const timestamp = new Date(message.sent_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        let statusDisplay = '';
        let actionsHtml = '';

        switch (status) {
            case 'pending':
                if (canRespond) {
                    actionsHtml = `
                        <div class="flex gap-2 mt-3">
                            <button
                                class="tournament-invitation-accept flex-1 px-3 py-1.5 bg-neutral-700 hover:bg-green-600/20 text-green-400 border border-green-600/30 hover:border-green-500 rounded transition text-sm font-medium"
                                data-invitation-id="${invitationId}"
                                data-tournament-id="${tournamentId}">
                                Join Tournament
                            </button>
                            <button
                                class="tournament-invitation-decline flex-1 px-3 py-1.5 bg-neutral-700 hover:bg-red-600/20 text-red-400 border border-red-600/30 hover:border-red-500 rounded transition text-sm font-medium"
                                data-invitation-id="${invitationId}">
                                Decline
                            </button>
                        </div>
                    `;
                    statusDisplay = '<p class="text-amber-500/80 text-xs mt-1">Waiting for your response...</p>';
                } else {
                    statusDisplay = '<p class="text-neutral-400 text-xs mt-1">Waiting for response...</p>';
                }
                break;
            case 'accepted':
                statusDisplay = '<p class="text-green-500/80 text-xs mt-1">Joined the tournament!</p>';
                break;
            case 'declined':
                statusDisplay = '<p class="text-red-500/80 text-xs mt-1">Declined</p>';
                break;
            case 'expired':
                statusDisplay = '<p class="text-neutral-500 text-xs mt-1">Expired</p>';
                break;
        }

        return `
            <div class="tournament-invitation-card p-4 bg-neutral-800 rounded-lg border border-neutral-700"
                 data-message-id="${message.id}"
                 data-invitation-id="${invitationId}">
                <div class="flex flex-col items-center text-center gap-2">
                    <div class="w-12 h-12 bg-amber-600/20 rounded-full flex items-center justify-center">
                        <span class="text-2xl">🏆</span>
                    </div>
                    <p class="text-white font-medium">${displayInviterName} invites you to join</p>
                    <p class="text-amber-400 font-semibold">"${displayTournamentName}"</p>
                    ${statusDisplay}
                </div>
                ${actionsHtml}
                <div class="text-xs text-neutral-500 mt-3 text-center">${timestamp}</div>
            </div>
        `;
    },

    async handleInviteToGame(invitedUserId: string): Promise<void> {
        if (!this.currentChannel) return;

        try {
            console.log('[CHAT] Sending game invitation to:', invitedUserId);
            await SocialCommands.sendGameInvitation(this.currentChannel.id, invitedUserId);
        } catch (error) {
            console.error('[CHAT] Failed to send invitation:', error);
            alert('Failed to send invitation');
        }
    },

    async handleAcceptInvitation(invitationId: string): Promise<void> {
        try {
            console.log('[CHAT] Accepting invitation:', invitationId);
            const result = await SocialCommands.acceptGameInvitation(invitationId);

            // Find the inviter's name from the cached messages
            let opponentName: string | undefined;
            for (const channel of this.cachedChannelsMap.values()) {
                for (const message of channel.messages) {
                    if (message.type === 'game_invitation' && message.metadata) {
                        const metadata = typeof message.metadata === 'string' 
                            ? JSON.parse(message.metadata) 
                            : message.metadata;
                        if (metadata.invitationId === invitationId) {
                            const inviterUser = App.cachedUsers.get(metadata.inviterId);
                            opponentName = inviterUser?.name;
                            break;
                        }
                    }
                }
                if (opponentName) break;
            }

            sessionStorage.setItem('game_invitation', JSON.stringify({
                invitationId,
                gameRoomId: result.gameRoomId,
                opponentName
            }));

            Router.navigate('/game');
        } catch (error) {
            console.error('[CHAT] Failed to accept invitation:', error);
            alert('Failed to accept invitation');
        }
    },

    async handleDeclineInvitation(invitationId: string): Promise<void> {
        try {
            console.log('[CHAT] Declining invitation:', invitationId);
            await SocialCommands.declineGameInvitation(invitationId);
        } catch (error) {
            console.error('[CHAT] Failed to decline invitation:', error);
            alert('Failed to decline invitation');
        }
    },

    async handleAcceptTournamentInvitation(invitationId: string): Promise<void> {
        try {
            console.log('[CHAT] Accepting tournament invitation:', invitationId);
            const result = await SocialCommands.acceptTournamentInvitation(invitationId);
            
            // Navigate to tournament page
            if (result?.tournamentId) {
                sessionStorage.setItem('selectedTournamentId', result.tournamentId);
                // Store the player ID so the tournament page knows we're a participant
                if (result.playerId) {
                    sessionStorage.setItem(`tournament_player_${result.tournamentId}`, result.playerId);
                }
                Router.navigate('/tournaments');
            }
        } catch (error) {
            console.error('[CHAT] Failed to accept tournament invitation:', error);
            alert('Failed to accept tournament invitation');
        }
    },

    async handleDeclineTournamentInvitation(invitationId: string): Promise<void> {
        try {
            console.log('[CHAT] Declining tournament invitation:', invitationId);
            await SocialCommands.declineTournamentInvitation(invitationId);
        } catch (error) {
            console.error('[CHAT] Failed to decline tournament invitation:', error);
            alert('Failed to decline tournament invitation');
        }
    },
}
