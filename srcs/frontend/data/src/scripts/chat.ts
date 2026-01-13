import {App} from './app.ts'
import {Message, Channel, SocialEvent} from '../shared/types'
import {socialClient} from  './social-client'

export const Chat = {

    init()
    {
        this.setupSocialEventListeners();
    },

    setupSocialEventListeners(){
        socialClient.on('channel_update', (event:SocialEvent) => {
            this.updateChannel(event.data);
        });

        socialClient.on('message_new', (event:SocialEvent) => {
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
    },

    updateChannel(channel: Channel){
        const oldOne = App.me.channels.findIndex((c: Channel) => c.id === channel.id);
        if (oldOne !== -1)
            App.me.channels[oldOne] = channel;
        else
            App.me.channels.push(channel);
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
        if (query)
            channels = App.me.channels.filter((channel: Channel) => channel.name.toLowerCase().includes(query));
        else
            channels = App.me.channels;

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
            // Fetch fresh channel data from backend
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
            <div class="channel flex items-center justify-between p-4 bg-neutral-800 rounded-lg hover:bg-neutral-750 transition cursor-pointer" data-channel-id="${channel.id}">
                <div class="flex items-center gap-3 flex-1">
                    <div class="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-white truncate">${displayName}</p>
                        <p class="text-sm text-neutral-400 truncate">${lastMessagePreview}</p>
                    </div>
                </div>
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
    },

    async displayMessages(channel: Channel)
    {
        const messageList = document.getElementById('channel-messages');
        const messageInput = document.getElementById('message-input-container');
        if (!messageList || !messageInput)
            return;

        // Store current channel ID for sending messages and persistence
        (App as any).currentChannelId = channel.id;
        sessionStorage.setItem('currentChannelId', String(channel.id));

        // Update chat header with channel/user info
        this.updateChatHeader(channel);

        messageList.innerHTML = channel.messages.map((message: Message) => this.createMessageCard(message)).join('');

        // Create message input form
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

        // Attach form submit handler
        const form = document.getElementById('message-form');
        form?.addEventListener('submit', (e) => this.handleSendMessage(e));
    },

    async handleSendMessage(e: Event)
    {
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
                input.value = ''; // Clear input
            } else {
                console.error('[CHAT] Failed to send message:', await response.text());
            }
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
