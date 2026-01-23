import {App} from '../app.ts'
import {Message, Channel, SocialEvent, UserPublic, GameInvitationData, GameResultData} from '../shared/types'
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
        channel.messages.push(message);
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

        headerActions.style.display = 'flex';
        headerActions.innerHTML = ''; // Clear existing buttons

        // Add "Invite to Play" button for online friends in private channels
        if (channel.type === 'private') {
            const otherUserId = channel.members.find((id: string) => String(id) !== String(App.me?.id));
            const isOnline = otherUserId && App.onlineUsersMap.has(otherUserId);
            const isFriend = otherUserId && App.isFriend(otherUserId);

            if (isFriend && isOnline) {
                const inviteBtn = `
                    <button
                        id="chat-invite-game"
                        class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm flex items-center gap-1"
                        title="Invite to play">
                        <span>⚔️</span>
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
            // If invitation card creation failed, show a fallback instead of plain text
            if (!card) {
                return `
                    <div class="p-4 bg-purple-900/50 rounded-lg border border-purple-600 text-neutral-400" data-message-id="${message.id}">
                        <span class="text-2xl">⚔️</span> Game invitation (details unavailable)
                    </div>
                `;
            }
            return card;
        } else if (message.type === 'game_result') {
            const card = this.createResultCard(message);
            if (!card) {
                return `
                    <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-600 text-neutral-400" data-message-id="${message.id}">
                        <span class="text-2xl">🏆</span> Game result (details unavailable)
                    </div>
                `;
            }
            return card;
        }

        // Check if content looks like a game invitation but type wasn't set properly
        if (message.content?.includes('challenges you to a duel')) {
            return `
                <div class="p-4 bg-purple-900/50 rounded-lg border border-purple-600 text-neutral-400" data-message-id="${message.id}">
                    <span class="text-2xl">⚔️</span> ${message.content}
                </div>
            `;
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
        if (!message.metadata) return '';

        const metadata = typeof message.metadata === 'string'
            ? JSON.parse(message.metadata) as GameInvitationData
            : message.metadata as GameInvitationData;

        const { invitationId, inviterId, status } = metadata;

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
                                class="invitation-accept flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
                                data-invitation-id="${invitationId}">
                                ⚔️ Accept
                            </button>
                            <button
                                class="invitation-decline flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
                                data-invitation-id="${invitationId}">
                                ❌ Decline
                            </button>
                        </div>
                    `;
                    statusDisplay = '<p class="text-yellow-400 text-sm mt-2">⏳ Waiting for your response...</p>';
                } else {
                    statusDisplay = '<p class="text-yellow-400 text-sm mt-2">⏳ Waiting for response...</p>';
                }
                break;
            case 'accepted':
                statusDisplay = '<p class="text-green-400 text-sm mt-2">✓ Accepted - Starting game...</p>';
                break;
            case 'declined':
                statusDisplay = '<p class="text-red-400 text-sm mt-2">✗ Declined</p>';
                break;
            case 'expired':
                statusDisplay = '<p class="text-gray-400 text-sm mt-2">⌛ Expired</p>';
                break;
        }

        return `
            <div class="invitation-card p-4 bg-gradient-to-r from-purple-900 to-purple-800 rounded-lg border-2 border-purple-600 shadow-lg"
                 data-message-id="${message.id}"
                 data-invitation-id="${invitationId}">
                <div class="flex items-start gap-3">
                    <span class="text-3xl">⚔️</span>
                    <div class="flex-1">
                        <p class="text-white font-semibold text-lg">${inviterName} challenges you to a duel!</p>
                        ${statusDisplay}
                    </div>
                </div>
                ${actionsHtml}
                <div class="text-xs text-neutral-300 mt-2">${timestamp}</div>
            </div>
        `;
    },

    createResultCard(message: Message) {
        if (!message.metadata) return '';

        const metadata = typeof message.metadata === 'string'
            ? JSON.parse(message.metadata) as GameResultData
            : message.metadata as GameResultData;

        const { winnerId, loserId, score1, score2 } = metadata;

        const winnerUser = App.cachedUsers.get(winnerId);
        const loserUser = App.cachedUsers.get(loserId);
        const winnerName = winnerUser?.name || 'Player';
        const loserName = loserUser?.name || 'Player';

        const isWinner = winnerId === App.me?.id;
        const isLoser = loserId === App.me?.id;

        // Color scheme based on outcome for current user
        let bgGradient: string;
        let borderColor: string;
        let resultEmoji: string;
        let resultText: string;

        if (isWinner) {
            bgGradient = 'from-green-900 to-green-800';
            borderColor = 'border-green-600';
            resultEmoji = '🏆';
            resultText = `You defeated ${loserName}!`;
        } else if (isLoser) {
            bgGradient = 'from-red-900 to-red-800';
            borderColor = 'border-red-600';
            resultEmoji = '💀';
            resultText = `${winnerName} defeated you!`;
        } else {
            bgGradient = 'from-blue-900 to-blue-800';
            borderColor = 'border-blue-600';
            resultEmoji = '⚔️';
            resultText = `${winnerName} defeated ${loserName}!`;
        }

        const timestamp = new Date(message.sent_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="result-card p-4 bg-gradient-to-r ${bgGradient} rounded-lg border-2 ${borderColor} shadow-lg"
                 data-message-id="${message.id}">
                <div class="flex items-start gap-3">
                    <span class="text-3xl">${resultEmoji}</span>
                    <div class="flex-1">
                        <p class="text-white font-semibold text-lg">Match Complete!</p>
                        <p class="text-white mt-1">${resultText}</p>
                        <div class="flex items-center gap-4 mt-2">
                            <div class="text-center">
                                <p class="text-2xl font-bold text-white">${score1}</p>
                                <p class="text-xs text-neutral-300">${winnerName}</p>
                            </div>
                            <span class="text-neutral-400">vs</span>
                            <div class="text-center">
                                <p class="text-2xl font-bold text-white">${score2}</p>
                                <p class="text-xs text-neutral-300">${loserName}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="text-xs text-neutral-300 mt-2">${timestamp}</div>
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

            sessionStorage.setItem('game_invitation', JSON.stringify({
                invitationId,
                gameRoomId: result.gameRoomId
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
}
