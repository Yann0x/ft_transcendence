import { App } from './app.ts'
import { Message, Channel, SocialEvent, UserPublic } from '../shared/types'
import { socialClient } from './social-client'
import { Router } from './router'

export const Social = {

    async init() {
        const token = sessionStorage.getItem('authToken');
        if (!App.me || !token) {
            console.log('[SOCIAL] You must be logged in');
            Router.navigate('home');
            return;
        }

        this.setupSocialEventListeners();
        this.setupCollapsibleSections();
        this.setupSearchListeners();

        // Load friends and conversations in parallel
        await Promise.all([
            this.loadFriends(),
            this.displayChannels()
        ]);

        // Auto-open last conversation
        await this.openLastConversation();
    },

    // ================== COLLAPSIBLE SECTIONS ==================

    setupCollapsibleSections() {
        const friendsHeader = document.getElementById('friends-section-header');
        const friendsContent = document.getElementById('friends-section-content');
        const chevron = document.getElementById('friends-chevron');

        // Load collapsed state from localStorage
        const isCollapsed = localStorage.getItem('friends-section-collapsed') === 'true';
        if (isCollapsed && friendsContent && chevron) {
            friendsContent.classList.add('collapsed');
            chevron.classList.add('collapsed');
        }

        friendsHeader?.addEventListener('click', () => {
            if (!friendsContent || !chevron) return;

            const willBeCollapsed = !friendsContent.classList.contains('collapsed');
            if (willBeCollapsed) {
                friendsContent.classList.add('collapsed');
                chevron.classList.add('collapsed');
            } else {
                friendsContent.classList.remove('collapsed');
                chevron.classList.remove('collapsed');
            }

            // Save state to localStorage
            localStorage.setItem('friends-section-collapsed', String(willBeCollapsed));
        });
    },

    // ================== WEBSOCKET EVENT LISTENERS ==================

    setupSocialEventListeners() {
        // Online/offline events
        socialClient.on('users_online', (event: SocialEvent) => {
            console.log('[SOCIAL] Received online users list:', event.data);
            if (event.data && event.data.users && Array.isArray(event.data.users)) {
                event.data.users.forEach((user: UserPublic) => {
                    App.onlineUsers.set(user.id, user);
                    this.updateUserOnlineStatusCard(user.id, 'online');
                });
                this.loadFriends();
                this.displayChannels();
            }
        });

        socialClient.on('user_online', (event: SocialEvent) => {
            console.log('[SOCIAL] User came online:', event.data);
            if (event.data && event.data.user) {
                App.onlineUsers.set(event.data.user.id, event.data.user);
                this.updateUserOnlineStatusCard(event.data.user.id, 'online');
                this.loadFriends();
            }
        });

        socialClient.on('user_offline', (event: SocialEvent) => {
            console.log('[SOCIAL] User went offline:', event.data);
            if (event.data && event.data.id) {
                App.onlineUsers.delete(event.data.id);
                this.updateUserOnlineStatusCard(event.data.id, 'offline');
                this.loadFriends();
            }
        });

        // User update events
        socialClient.on('user_update', async (event: SocialEvent) => {
            console.log('[SOCIAL] User update event:', event.data);
            if (!event.data || !event.data.userId) return;

            const updatedUserId = event.data.userId;
            if (App.me && updatedUserId === App.me.id) {
                await this.refreshCurrentUserData();
            } else {
                await this.handleOtherUserUpdate(updatedUserId);
            }

            this.loadFriends();
            this.displayChannels();
        });

        // Channel events
        socialClient.on('channel_update', (event: SocialEvent) => {
            this.updateChannel(event.data);
        });

        socialClient.on('message_new', (event: SocialEvent) => {
            this.addMessageToChannel(event.data);
        });
    },

    async refreshCurrentUserData() {
        try {
            const token = sessionStorage.getItem('authToken');
            if (!token || !App.me?.id) return;

            console.log('[SOCIAL] Refreshing current user data...');
            const response = await fetch(`/user/find?id=${App.me.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                console.error('[SOCIAL] Failed to refresh user data');
                return;
            }

            const users = await response.json();
            if (users && users.length > 0) {
                App.me = users[0];
                sessionStorage.setItem('currentUser', JSON.stringify(users[0]));
                App.updateNavbar();
            }
        } catch (error) {
            console.error('[SOCIAL] Error refreshing user data:', error);
        }
    },

    async handleOtherUserUpdate(userId: string) {
        try {
            const token = sessionStorage.getItem('authToken');
            if (!token) return;

            const response = await fetch(`/user/find?id=${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) return;

            const users = await response.json();
            if (!users || users.length === 0) return;

            const updatedUser = users[0] as UserPublic;

            // Update in friends list
            if (App.me?.friends) {
                const friendIndex = App.me.friends.findIndex((f: UserPublic) => f.id === userId);
                if (friendIndex !== -1) {
                    App.me.friends[friendIndex] = updatedUser;
                    sessionStorage.setItem('currentUser', JSON.stringify(App.me));
                }
            }

            // Update in online users
            if (App.onlineUsers.has(userId)) {
                App.onlineUsers.set(userId, updatedUser);
            }
        } catch (error) {
            console.error('[SOCIAL] Error handling user update:', error);
        }
    },

    updateUserOnlineStatusCard(userId: string, status: 'online' | 'offline') {
        const statusDots = document.querySelectorAll(`[data-user-id="${userId}"] .status-dot`);
        statusDots.forEach(dot => {
            if (status === 'online') {
                dot.classList.remove('bg-neutral-500');
                dot.classList.add('bg-green-500');
            } else {
                dot.classList.remove('bg-green-500');
                dot.classList.add('bg-neutral-500');
            }
        });

        const statusTexts = document.querySelectorAll(`[data-user-id="${userId}"] .status-text`);
        statusTexts.forEach(text => {
            text.textContent = status;
        });
    },

    // ================== FRIENDS SECTION ==================

    setupSearchListeners() {
        const searchInput = document.getElementById('user-search-input') as HTMLInputElement;
        const searchBtn = document.getElementById('search-users-btn');

        searchBtn?.addEventListener('click', () => {
            this.loadUserSearch();
        });

        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadUserSearch();
            }
        });
    },

    async loadUserSearch() {
        const searchInput = document.getElementById('user-search-input') as HTMLInputElement;
        const query = searchInput?.value.trim() || '';
        let users: UserPublic[] | undefined;

        if (query) {
            try {
                const token = sessionStorage.getItem('authToken');
                if (!token) return;

                const url = `/user/find?name=${encodeURIComponent(query)}`;
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error('Search failed');
                users = await response.json() as UserPublic[];
            } catch (error) {
                console.error('[SOCIAL] Search error:', error);
            }
        } else {
            users = Array.from(App.onlineUsers.values());
        }

        this.displaySearchResults(users);
    },

    displaySearchResults(users: UserPublic[] | undefined) {
        const resultsContainer = document.getElementById('search-results');
        const resultsList = document.getElementById('search-results-list');

        if (!resultsContainer || !resultsList || !users) return;

        const filteredUsers = users
            .filter(user => user.id !== App.me?.id)
            .filter(user => !App.me?.friends?.some(friend => friend.id === user.id));

        if (filteredUsers.length === 0) {
            resultsList.innerHTML = '<p class="text-neutral-500 text-center py-4 text-sm">No users found</p>';
            resultsContainer.classList.remove('hidden');
            return;
        }

        resultsList.innerHTML = filteredUsers.map(user => this.createSearchUserCard(user)).join('');
        this.attachSearchActionListeners();
        resultsContainer.classList.remove('hidden');
    },

    createSearchUserCard(user: UserPublic): string {
        const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3b82f6&color=fff`;
        const isOnline = App.onlineUsers.has(user.id);
        const statusColor = isOnline ? 'bg-green-500' : 'bg-neutral-500';
        const statusText = isOnline ? 'online' : 'offline';

        return `
            <div class="flex items-center justify-between p-3 bg-neutral-800 rounded-lg hover:bg-neutral-750 transition" data-user-id="${user.id}">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="relative flex-shrink-0">
                        <img src="${avatar}" alt="${user.name}" class="w-10 h-10 rounded-full object-cover">
                        <span class="status-dot absolute bottom-0 right-0 w-2.5 h-2.5 ${statusColor} border-2 border-neutral-800 rounded-full"></span>
                    </div>
                    <div class="min-w-0">
                        <p class="font-semibold text-white text-sm truncate">${user.name || 'Unknown'}</p>
                        <p class="status-text text-xs text-neutral-400">${statusText}</p>
                    </div>
                </div>
                <button class="add_friend px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition flex-shrink-0" data-user-id="${user.id}">
                    Add
                </button>
            </div>
        `;
    },

    createFriendCard(user: UserPublic): string {
        const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3b82f6&color=fff`;
        const isOnline = App.onlineUsers.has(user.id);
        const statusColor = isOnline ? 'bg-green-500' : 'bg-neutral-500';
        const statusText = isOnline ? 'online' : 'offline';

        return `
            <div class="flex items-center justify-between p-3 bg-neutral-800 rounded-lg hover:bg-neutral-750 transition" data-user-id="${user.id}">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="relative flex-shrink-0">
                        <img src="${avatar}" alt="${user.name}" class="w-10 h-10 rounded-full object-cover">
                        <span class="status-dot absolute bottom-0 right-0 w-2.5 h-2.5 ${statusColor} border-2 border-neutral-800 rounded-full"></span>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-semibold text-white text-sm truncate">${user.name || 'Unknown'}</p>
                        <p class="status-text text-xs text-neutral-400">${statusText}</p>
                    </div>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                    <button class="chat_friend p-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded transition" title="Chat" data-user-id="${user.id}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 21l1.8-4A7.97 7.97 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                    </button>
                    <button class="remove_friend p-2 bg-red-600 hover:bg-red-700 text-white rounded transition" title="Remove" data-user-id="${user.id}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    },

    attachSearchActionListeners() {
        document.querySelectorAll('.add_friend').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const target_id = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
                if (target_id) await this.addFriend(target_id);
            });
        });
    },

    attachFriendActionListeners() {
        document.querySelectorAll('.chat_friend').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
                if (userId) {
                    await this.openChatWithFriend(userId);
                }
            });
        });

        document.querySelectorAll('.remove_friend').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = (e.currentTarget as HTMLElement).getAttribute('data-user-id');
                if (userId) {
                    await this.removeFriend(userId);
                }
            });
        });
    },

    async loadFriends() {
        const friendsList = document.getElementById('friends-list');
        const friendsCount = document.getElementById('friends-count');
        const emptyState = document.getElementById('friends-empty-state');

        if (!friendsList || !App.me) return;

        const friends = App.me.friends || [];

        if (friends.length === 0) {
            if (emptyState) {
                friendsList.innerHTML = emptyState.outerHTML;
            }
            if (friendsCount) friendsCount.textContent = '0';
            return;
        }

        friendsList.innerHTML = friends.map((friend: UserPublic) => this.createFriendCard(friend)).join('');
        this.attachFriendActionListeners();

        if (friendsCount) friendsCount.textContent = String(friends.length);
    },

    async addFriend(targetId: string) {
        try {
            const token = sessionStorage.getItem('authToken');
            if (!token) {
                console.error('[SOCIAL] No auth token available');
                return;
            }

            console.log('[SOCIAL] Adding friend:', targetId);

            const response = await fetch('/user/addFriend', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ friendId: targetId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('[SOCIAL] Failed to add friend:', errorData);
                alert(`Failed to add friend: ${errorData.message || 'Unknown error'}`);
                return;
            }

            const result = await response.json();
            console.log('[SOCIAL] Friend added successfully:', result);
            alert('Friend added successfully!');
        } catch (error) {
            console.error('[SOCIAL] Error adding friend:', error);
            alert('Error adding friend. Please try again.');
        }
    },

    async removeFriend(friendId: string) {
        try {
            const token = sessionStorage.getItem('authToken');
            if (!token) return;

            const response = await fetch('/user/rmFriend', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ friendId })
            });

            if (!response.ok) {
                console.error('[SOCIAL] Failed to remove friend');
                return;
            }

            console.log('[SOCIAL] Friend removed successfully');
        } catch (error) {
            console.error('[SOCIAL] Error removing friend:', error);
        }
    },

    // ================== FRIEND TO CHAT FLOW ==================

    async openChatWithFriend(friendId: string) {
        try {
            console.log('[SOCIAL] Opening chat with friend:', friendId);

            // Try to find existing DM channel
            const response = await fetch(`/user/channel/find-dm?userId=${friendId}`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                }
            });

            let channelId;

            if (response.ok) {
                const channel = await response.json();
                channelId = channel.id;
                console.log('[SOCIAL] Found existing DM channel:', channelId);
            } else {
                // Create new DM channel if doesn't exist
                console.log('[SOCIAL] Creating new DM channel...');
                const createResponse = await fetch('/user/channel/create-dm', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userId: friendId })
                });

                if (!createResponse.ok) {
                    console.error('[SOCIAL] Failed to create DM channel');
                    return;
                }

                const newChannel = await createResponse.json();
                channelId = newChannel.id;
                console.log('[SOCIAL] Created DM channel:', channelId);

                // Refresh conversations list to show new channel
                await this.displayChannels();
            }

            // Open the channel
            await this.loadAndDisplayChannel(channelId);
        } catch (error) {
            console.error('[SOCIAL] Error opening chat with friend:', error);
        }
    },

    // ================== CONVERSATIONS SECTION ==================

    addMessageToChannel(message: Message) {
        const channel = App.me.channels.find((c: Channel) => c.id === message.channel_id);
        if (!channel) {
            console.log(`[SOCIAL] No channel found for message in channel ${message.channel_id}`);
            return;
        }
        channel.messages.push(message);

        // If this is the currently displayed channel, update the UI
        if ((App as any).currentChannelId === message.channel_id) {
            const messageList = document.getElementById('channel-messages');
            if (messageList) {
                const messageCard = this.createMessageCard(message);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = messageCard;
                messageList.appendChild(tempDiv.firstElementChild!);

                // Scroll to bottom to show new message
                messageList.scrollTop = messageList.scrollHeight;
            }
        }

        // Refresh channel list to update visual state (unread badge, colors)
        this.displayChannels();
    },

    updateChannel(channel: Channel) {
        const oldOne = App.me.channels.findIndex((c: Channel) => c.id === channel.id);
        if (oldOne !== -1) {
            App.me.channels[oldOne] = channel;
        } else {
            App.me.channels.push(channel);
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
            badge.textContent = totalUnread > 99 ? '99+' : String(totalUnread);
            badge.classList.remove('hidden');
            badge.classList.add('flex');
        } else {
            badge.classList.add('hidden');
            badge.classList.remove('flex');
        }
    },

    async displayChannels() {
        const channelsList = document.getElementById('channels-list');
        const searchInput = document.getElementById('channel-search-input') as HTMLInputElement;

        if (!channelsList || !App.me) return;

        if (!App.me.channels) {
            App.me.channels = [];
        }

        const query = searchInput?.value.trim().toLowerCase() || '';
        let channels;
        if (query) {
            channels = App.me.channels.filter((channel: Channel) => {
                const displayName = this.getChannelDisplayName(channel);
                return displayName.toLowerCase().includes(query);
            });
        } else {
            channels = App.me.channels;
        }

        if (channels.length === 0) {
            channelsList.innerHTML = `
                <div class="p-8 text-center text-neutral-500 text-sm">
                    <p>No conversations</p>
                    <p class="text-xs mt-1">Start chatting with a friend!</p>
                </div>
            `;
        } else {
            channelsList.innerHTML = channels.map((channel: Channel) => this.createChannelCard(channel)).join('');
            this.attachChannelListeners();
        }

        // Attach search listener if not already attached
        if (!searchInput.dataset.listenerAttached) {
            searchInput.addEventListener('input', () => {
                this.displayChannels();
            });
            searchInput.dataset.listenerAttached = 'true';
        }

        // Update navbar badge
        this.updateNavbarBadge();
    },

    async attachChannelListeners() {
        document.querySelectorAll('.channel').forEach(card => {
            card.addEventListener('click', async (e) => {
                const channel_id = (e.currentTarget as HTMLElement).getAttribute('data-channel-id');
                if (channel_id) {
                    await this.loadAndDisplayChannel(parseInt(channel_id));
                }
            });
        });
    },

    async openLastConversation() {
        if (!App.me.channels || App.me.channels.length === 0) {
            console.log('[SOCIAL] No channels available to auto-open');
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
        console.log('[SOCIAL] Auto-opening last conversation:', lastChannel.name);

        await this.loadAndDisplayChannel(lastChannel.id);
    },

    async loadAndDisplayChannel(channelId: number) {
        try {
            const response = await fetch(`/user/channel/${channelId}`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                console.error('[SOCIAL] Failed to fetch channel:', await response.text());
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
            console.error('[SOCIAL] Error loading channel:', error);
        }
    },

    getChannelDisplayName(channel: Channel): string {
        let displayName = channel.name;
        if (channel.type === 'private' && channel.name.includes('&')) {
            const names = channel.name.split('&');
            displayName = names[0] === App.me.name ? names[1] : names[0];
        }
        return displayName;
    },

    createChannelCard(channel: Channel) {
        const displayName = this.getChannelDisplayName(channel);

        const isActive = (App as any).currentChannelId === channel.id;
        const hasUnread = this.hasUnreadMessages(channel);

        let bgColor, hoverColor;
        if (isActive) {
            bgColor = 'bg-blue-600';
            hoverColor = 'hover:bg-blue-700';
        } else if (hasUnread) {
            bgColor = 'bg-neutral-800';
            hoverColor = 'hover:bg-neutral-750';
        } else {
            bgColor = 'bg-neutral-900';
            hoverColor = 'hover:bg-neutral-800';
        }

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

        return `
            <div class="channel flex items-center justify-between p-4 rounded-lg transition cursor-pointer ${bgColor} ${hoverColor}" data-channel-id="${channel.id}">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="flex items-center justify-center w-12 h-12 rounded-full ${iconBgColor} flex-shrink-0">
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
    },

    // ================== CHAT AREA ==================

    updateChatHeader(channel: Channel) {
        const headerName = document.getElementById('chat-header-name');
        const headerStatus = document.getElementById('chat-header-status');
        const headerAvatar = document.getElementById('chat-header-avatar');
        const headerActions = document.getElementById('chat-header-actions');

        if (!headerName || !headerStatus || !headerAvatar || !headerActions) return;

        const displayName = this.getChannelDisplayName(channel);

        headerName.textContent = displayName;

        if (channel.type === 'private') {
            const otherUserId = channel.members.find((id: string) => id !== App.me.id);
            const isOnline = otherUserId && App.onlineUsers.has(otherUserId);
            headerStatus.textContent = isOnline ? 'Online' : 'Offline';
            headerStatus.className = isOnline
                ? 'text-xs text-green-400'
                : 'text-xs text-neutral-400';
        } else {
            headerStatus.textContent = `${channel.members.length} members`;
            headerStatus.className = 'text-xs text-neutral-400';
        }

        headerAvatar.textContent = displayName.charAt(0).toUpperCase();
        headerActions.style.display = 'flex';
    },

    async displayMessages(channel: Channel) {
        const messageList = document.getElementById('channel-messages');
        const messageInput = document.getElementById('message-input-container');
        if (!messageList || !messageInput) return;

        (App as any).currentChannelId = channel.id;

        this.updateChatHeader(channel);

        messageList.innerHTML = channel.messages.map((message: Message) => this.createMessageCard(message)).join('');

        requestAnimationFrame(() => {
            messageList.scrollTop = messageList.scrollHeight;
        });

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
    },

    async handleSendMessage(e: Event) {
        e.preventDefault();
        const input = document.getElementById('message-content-input') as HTMLInputElement;
        const content = input?.value.trim();

        if (!content || !(App as any).currentChannelId) return;

        try {
            const response = await fetch('/user/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    channel_id: (App as any).currentChannelId,
                    content: content
                })
            });

            if (response.ok) {
                input.value = '';
            } else {
                console.error('[SOCIAL] Failed to send message:', await response.text());
            }
        } catch (error) {
            console.error('[SOCIAL] Error sending message:', error);
        }
    },

    createMessageCard(message: Message) {
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

        return `
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
    },
}
