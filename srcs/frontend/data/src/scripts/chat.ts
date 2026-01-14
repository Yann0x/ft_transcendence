import {App} from './app.ts'
import {Message, Channel, SocialEvent} from '../shared/types'
import {socialClient} from  './social-client'

export const Chat = 
{    
    async openLastConversation() {
        if (!App.me.channels || App.me.channels.length === 0) {
            console.log('[CHAT] No channels available to auto-open');
            return;
        }

      const sortedChannels = [...App.me.channels].sort((a: Channel, b: Channel) => {
            const aLastMsg = a.messages[a.messages.length - 1];
            const bLastMsg = b.messages[b.messages.length - 1];

            if (!aLastMsg && !bLastMsg) return 0;
            if (!aLastMsg) return 1;
            if (!bLastMsg) return -1;

            return new Date(bLastMsg.sent_at).getTime() - new Date(aLastMsg.sent_at).getTime();
        });

        const lastChannel = sortedChannels[0];
        console.log('[CHAT] opening last conversation:', lastChannel.name);

        await this.loadAndDisplayChannel(lastChannel.id);
    },

    setupSocialEventListeners(){
        socialClient.on('channel_update', (event: SocialEvent) => {
            this.updateChannel(event.data);
        });
        socialClient.on('message_new', (event: SocialEvent) => {
            this.addMessageToChannel(event.data);
        });
    },

    addMessageToChannel(message: Message) {
        const channel = App.me.channels.find((c: Channel) => c.id === message.channel_id);
        if (!channel)
        {
            console.log(`[CHAT] No channel found for message in channel ${message.channel_id}`);
            return ;
        }
        let messageInChannel = channel.messages.find(m => m.id === message.id)
        if (messageInChannel){
            messageInChannel = message;
            return ;
        }
        channel.messages.push(message);

        const isCurrentChannel = (App as any).currentChannelId === message.channel_id;
        const isOnSocialPage = window.location.pathname === '/social_hub' || window.location.pathname === '/social_hub/';
        if (isCurrentChannel && isOnSocialPage) {
            if (message.sender_id !== App.me.id && message.read_at === null) {
                message.read_at = new Date().toISOString();
                fetch(`/user/channel/${message.channel_id}/read`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                    }
                }).catch(error => {
                    console.error('[CHAT] Failed to mark channel as read:', error);
                });
                this.updateNavbarBadge();
            }
            const messageList = document.getElementById('channel-messages');
            if (messageList) {
                const messageCard = this.createMessageCard(message);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = messageCard;
                messageList.appendChild(tempDiv.firstElementChild!);

                messageList.scrollTop = messageList.scrollHeight;
            }
        }
        this.displayChannels();
    },

    updateChannel(channel: Channel){
        console.log('[CHAT] Updating channel:', channel.id);
        const oldOne = App.me.channels.findIndex((c: Channel) => c.id === channel.id);
        if (oldOne !== -1) {
            App.me.channels[oldOne] = channel;
        } else {
            App.me.channels.push(channel);
        }
        if ((App as any).currentChannelId === channel.id) {
            this.displayMessages(channel);
        }
        // Refresh channel list to update unread badges and visual state
        this.displayChannels();
        // Update navbar badge
        this.updateNavbarBadge();
    },

    hasUnreadMessages(channel: Channel): boolean {
        return channel.messages.some((msg: Message) =>
            msg.read_at === null && msg.sender_id !== App.me.id
        );
    },

    updateNavbarBadge() {
        const badge = document.getElementById('chat-unread-badge');
        if (!badge) return;

        // Hide badge when on social page (user can already see unread in channel list)
        const isOnSocialPage = window.location.pathname === '/social_hub' || window.location.pathname === '/social_hub/';
        if (isOnSocialPage) {
            badge.classList.add('hidden');
            badge.classList.remove('flex');
            return;
        }

        let totalUnread = 0;
        if (App.me && App.me.channels) {
            App.me.channels.forEach((channel: Channel) => {
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

    async displayChannels()
    {
        console.log('[CHAT] displayChannels called');
        const channelsList = document.getElementById('channels-list');
        const searchInput = document.getElementById('channel-search-input') as HTMLInputElement;

        if (!channelsList) {
            console.error('[CHAT] channels-list element not found');
            return;
        }
        if (!searchInput) {
            console.error('[CHAT] channel-search-input element not found');
            return;
        }
        if (!App.me) {
            console.error('[CHAT] App.me is null');
            return;
        }
        if (!App.me.channels) {
            console.log('[CHAT] No channels found for user, initializing empty array');
            App.me.channels = [];
        }
        console.log('[CHAT] User has', App.me.channels.length, 'channels');
        const query = searchInput?.value.trim().toLowerCase() || '';
        let channels;
        if (query) {
            // Filter by display name (handles DM channels properly)
            channels = App.me.channels.filter((channel: Channel) => {
                const displayName = this.getChannelDisplayName(channel);
                return displayName.toLowerCase().includes(query);
            });
        } else {
            channels = App.me.channels;
        }
        channels = [...channels].sort((a: Channel, b: Channel) => {
            const aLastMsg = a.messages[a.messages.length - 1];
            const bLastMsg = b.messages[b.messages.length - 1];

            // Channels without messages go to the bottom
            if (!aLastMsg && !bLastMsg) return 0;
            if (!aLastMsg) return 1;
            if (!bLastMsg) return -1;

            // Sort by timestamp - most recent first
            return new Date(bLastMsg.sent_at).getTime() - new Date(aLastMsg.sent_at).getTime();
        });

        console.log('[CHAT] 📊 Channels sorted by most recent message');

        if (channels.length === 0) {
            channelsList.innerHTML = `
                <div class="p-8 text-center text-neutral-500 text-sm">
                    <p>Aucune conversation</p>
                    <p class="text-xs mt-2">Ajoutez des amis pour commencer à discuter!</p>
                </div>
            `;
        } else {
            channelsList.innerHTML = channels.map((channel: Channel) => this.createChannelCard(channel)).join('');
            this.attachChannelListeners();
        }

        // Attach search listener if not already attached
        if (!searchInput.dataset.listenerAttached) {
            searchInput.addEventListener('input', () => {
                this.displayChannels(); // Re-render on every input change
            });
            searchInput.dataset.listenerAttached = 'true';
        }

        // Update navbar badge
        this.updateNavbarBadge();
    },

    async attachChannelListeners(){
       document.querySelectorAll('.channel').forEach(card => {
        card.addEventListener('click', async(e) => {
            const channel_id = (e.currentTarget as HTMLElement).getAttribute('data-channel-id');
            if  (channel_id)
            {
                await this.loadAndDisplayChannel(parseInt(channel_id));
            }
        })
       })
    },

    async loadAndDisplayChannel(channelId: number) {
        try {
            const response = await fetch(`/user/channel/${channelId}`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                console.error('[CHAT] Failed to fetch channel:', await response.text());
                return;
            }
            const channel = await response.json() as Channel;

            // Update local channel in App.me.channels
            const existingIndex = App.me.channels.findIndex((c: Channel) => c.id === channel.id);
            if (existingIndex !== -1) {
                App.me.channels[existingIndex] = channel;
            } else {
                App.me.channels.push(channel);
            }

            // Display the fresh channel data
            await this.displayMessages(channel);

            // Mark all messages as read
            await fetch(`/user/channel/${channelId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                }
            });

            // Update the channel in local state to reflect read status
            if (existingIndex !== -1) {
                const now = new Date().toISOString();
                App.me.channels[existingIndex].messages.forEach((msg: Message) => {
                    if (msg.sender_id !== App.me.id && msg.read_at === null) {
                        msg.read_at = now;
                    }
                });
            }

            // Refresh channel list to update visual state
            await this.displayChannels();
        } catch (error) {
            console.error('[CHAT] Error loading channel:', error);
        }
    },

    getChannelDisplayName(channel: Channel): string {
        // For DM channels, display only the other person's name
        let displayName = channel.name;
        if (channel.type === 'private' && channel.name.includes('&')) {
            const names = channel.name.split('&');
            // Show the name that isn't the current user's name
            displayName = names[0] === App.me.name ? names[1] : names[0];
        }
        return displayName;
    },

    createChannelCard(channel: Channel)
    {
        const displayName = this.getChannelDisplayName(channel);

        // Determine background color based on state
        const isActive = (App as any).currentChannelId === channel.id;
        const hasUnread = this.hasUnreadMessages(channel);

        let bgColor, hoverColor;
        if (isActive) {
            bgColor = 'bg-blue-600'; // Opened conversation
            hoverColor = 'hover:bg-blue-700';
        } else if (hasUnread) {
            bgColor = 'bg-neutral-800'; // Unread messages
            hoverColor = 'hover:bg-neutral-750';
        } else {
            bgColor = 'bg-neutral-900'; // All read
            hoverColor = 'hover:bg-neutral-800';
        }

        // Calculate unread count
        const unreadCount = channel.messages.filter((msg: Message) =>
            msg.read_at === null && msg.sender_id !== App.me.id
        ).length;

        // Icon background color - subtle variation based on state
        let iconBgColor;
        if (isActive) {
            iconBgColor = 'bg-blue-700'; // Slightly darker blue for active
        } else if (hasUnread) {
            iconBgColor = 'bg-blue-600'; // Standard blue for unread
        } else {
            iconBgColor = 'bg-neutral-700'; // Neutral grey for read
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

        const card = `
            <div class="channel flex items-center justify-between p-4 rounded-lg transition cursor-pointer" data-channel-id="${channel.id}">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="flex items-center justify-center w-12 h-12 rounded-full ${iconBgColor}">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                        </svg>
                    </div>
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

    updateChatHeader(channel: Channel) {
        const headerName = document.getElementById('chat-header-name');
        const headerStatus = document.getElementById('chat-header-status');
        const headerAvatar = document.getElementById('chat-header-avatar');
        const headerActions = document.getElementById('chat-header-actions');

        if (!headerName || !headerStatus || !headerAvatar || !headerActions) return;

        const displayName = this.getChannelDisplayName(channel);

        // Update header name
        headerName.textContent = displayName;

        // Update header status (for DM, show online status if available)
        if (channel.type === 'private') {
            // Find the other user in the channel to check online status
            const otherUserId = channel.members.find((id: string) => id !== App.me.id);
            const isOnline = otherUserId && App.onlineUsers.has(otherUserId);
            headerStatus.textContent = isOnline ? 'En ligne' : 'Hors ligne';
            headerStatus.className = isOnline
                ? 'text-xs text-green-400'
                : 'text-xs text-neutral-400';
        } else {
            headerStatus.textContent = `${channel.members.length} membres`;
            headerStatus.className = 'text-xs text-neutral-400';
        }

        // Update avatar (first letter of name)
        headerAvatar.textContent = displayName.charAt(0).toUpperCase();

        // Show action buttons
        headerActions.style.display = 'flex';

        // Attach block button listener
        this.attachBlockButtonListener(channel);
    },

    attachBlockButtonListener(channel: Channel) {
        const blockBtn = document.getElementById('block-user-btn');
        if (!blockBtn) return;
        const otherUserId = channel.members.find((id: string) => id !== App.me.id);
        if (!otherUserId) return;
        const isBlocked = App.me.blocked_users?.includes(otherUserId) || false;
        const buttonSpan = blockBtn.querySelector('span');
        if (buttonSpan) {
            buttonSpan.textContent = isBlocked ? '✅' : '🚫';
        }
        blockBtn.title = isBlocked ? 'Unblock user' : 'Block user';

        // Remove old listener if exists
        const newBlockBtn = blockBtn.cloneNode(true) as HTMLElement;
        blockBtn.parentNode?.replaceChild(newBlockBtn, blockBtn);

        // Add new listener
        newBlockBtn.addEventListener('click', async () => {
            // Only allow blocking in private (DM) channels
            if (channel.type !== 'private') {
                alert('You can only block users in direct messages');
                return;
            }

            if (isBlocked) {
                await this.unblockUser(otherUserId);
            } else {
                await this.blockUser(otherUserId);
            }
        });
    },

    async blockUser(userId: string) {
        try {
            const token = sessionStorage.getItem('authToken');
            if (!token) {
                alert('Not authenticated');
                return;
            }
            // Confirm before blocking
            const userName = App.onlineUsers.get(userId)?.name || 'this user';
            const confirmed = confirm(`Are you sure you want to block ${userName}? You won't receive messages from them anymore.`);
            if (!confirmed) return;

            console.log('[CHAT] 🚫 Blocking user:', userId);

            const response = await fetch('/user/block', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ blockedUserId: userId })
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('[CHAT] Failed to block user:', error);
                alert(error.message || 'Failed to block user');
                return;
            }

            const result = await response.json();
            console.log('[CHAT] ✅ User blocked successfully:', result);

            // Update local state
            if (!App.me.blocked_users) {
                App.me.blocked_users = [];
            }
            if (!App.me.blocked_users.includes(userId)) {
                App.me.blocked_users.push(userId);
            }

            // Update sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(App.me));

            // Refresh the current channel display to show blocking message
            const currentChannelId = (App as any).currentChannelId;
            if (currentChannelId) {
                const channel = App.me.channels.find((c: Channel) => c.id === currentChannelId);
                if (channel) {
                    await this.displayMessages(channel);
                }
            }

            // Refresh channel list (user may have been removed from friends)
            this.displayChannels();

            alert('User blocked successfully');
        } catch (error) {
            console.error('[CHAT] Error blocking user:', error);
            alert('Error blocking user. Please try again.');
        }
    },

    async unblockUser(userId: string) {
        try {
            const token = sessionStorage.getItem('authToken');
            if (!token) {
                alert('Not authenticated');
                return;
            }

            // Confirm before unblocking
            const userName = App.onlineUsers.get(userId)?.name || 'this user';
            const confirmed = confirm(`Are you sure you want to unblock ${userName}?`);
            if (!confirmed) return;

            console.log('[CHAT] ✅ Unblocking user:', userId);

            const response = await fetch('/user/unblock', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ blockedUserId: userId })
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('[CHAT] Failed to unblock user:', error);
                alert(error.message || 'Failed to unblock user');
                return;
            }

            const result = await response.json();
            console.log('[CHAT] ✅ User unblocked successfully:', result);

            // Update local state
            if (App.me.blocked_users) {
                App.me.blocked_users = App.me.blocked_users.filter((id: string) => id !== userId);
            }

            // Update sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(App.me));

            // Refresh the current channel display to remove blocking message
            const currentChannelId = (App as any).currentChannelId;
            if (currentChannelId) {
                const channel = App.me.channels.find((c: Channel) => c.id === currentChannelId);
                if (channel) {
                    await this.displayMessages(channel);
                }
            }

            // Refresh channel list
            this.displayChannels();

            alert('User unblocked successfully');
        } catch (error) {
            console.error('[CHAT] Error unblocking user:', error);
            alert('Error unblocking user. Please try again.');
        }
    },

    async displayMessages(channel: Channel)
    {
        const messageList = document.getElementById('channel-messages');
        const messageInput = document.getElementById('message-input-container');
        if (!messageList || !messageInput)
            return;

        (App as any).currentChannelId = channel.id;

        this.updateChatHeader(channel);

        // Display all messages
        let messagesHTML = channel.messages.map((message: Message) => this.createMessageCard(message)).join('');

        // Check if conversation is blocked (backend provides this)
        const isBlocked = (channel as any).isBlocked || false;

        messageList.innerHTML = messagesHTML;

        requestAnimationFrame(() => {
            messageList.scrollTop = messageList.scrollHeight;
        });

        // Disable input if conversation is blocked
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

            const form = document.getElementById('message-form');
            form?.addEventListener('submit', (e) => this.handleSendMessage(e));

            // Focus on message input
            const input = document.getElementById('message-content-input') as HTMLInputElement;
            input?.focus();
        }
    },

    async handleSendMessage(e: Event)
    {
        e.preventDefault();
        const input = document.getElementById('message-content-input') as HTMLInputElement;
        const content = input?.value.trim();

        const message = {
                    channel_id: (App as any).currentChannelId,
                    content: content
                }
        if (!message.channel_id || !message.content) return;

        try {
            const status = await fetch('/user/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                },
                body: JSON.stringify(message)
            });
            if  (!status.ok) {
                console.log('fetch /user/message return status not ok')
                return;
            }
            const reply = await status.json();

            console.log(`add ${reply.message}  to chanel`)
            this.addMessageToChannel(reply.message)
            input.value = '';
        } catch (error) {
            console.error('[CHAT] Error sending message:', error);
        }
    },

    createMessageCard(message: Message)
    {
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
}
