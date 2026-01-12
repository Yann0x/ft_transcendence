import {Friends} from './friends.ts'
import {App} from './app.ts'
import {Message, Channel, SocialEvent} from '../shared/types'
import {socialClient} from  './social-client'

export const Chat = {

    setupSocialEventListeners(){
        socialClient.on('channel_update', (event:SocialEvent) => {
            this.updateChannel(event.data);
        });
    
        socialClient.on('message_new', (event:SocialEvent) => {
            this.addMessageToChannel(event.data);
        });
    },

    addMessageToChannel(message: Message) {
        const channel = App.me.channels.find(c => c.id === message.channel_id);
        if (!channel)
        {
            console.log(`[CHAT] No channel found for ${message}`);
            return ;
        }
        channel.messages.push(message);
    },

    updateChannel(channel: Channel){
        const oldOne = App.me.channels.findIndex(c => c.id === channel.id);
        if (oldOne !== -1)
            App.me.channels[oldOne] = channel;
        else 
            App.me.channels.push(channel);
    },

    async displayChannels()
    {
        const channelsList = document.getElementById('channels-list');
        const searchInput = document.getElementById('channel-search-input') as HTMLInputElement;
        if (!channelsList || !searchInput)
            return;
        const query = searchInput?.value.trim().toLowerCase() || '';
        let channels;
        if (query)
            channels = App.me.channels.filter(channel => channel.name.toLowerCase().includes(query));
        else 
            channels = App.me.channels;
        channelsList.innerHTML = channels.map(channel => this.createChannelCard(channel)).join('');
        this.attachChannelListeners();
    },

    async attachChannelListeners(){
       document.querySelectorAll('.channel').forEach(card => {
        card.addEventListener('click', async(e) => {
            const channel_id = (e.currentTarget as HTMLElement).getAttribute('data-channel-id');
            if  (channel_id)
            {
                const channel = App.me.channel.find(c => c.id === channel_id)
                await this.displayMessages(channel);
            }
        })
       })
    },

    createChannelCard(channel: Channel)
    {
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
                        <p class="font-semibold text-white truncate">${channel.name}</p>
                        <p class="text-sm text-neutral-400 truncate">${lastMessagePreview}</p>
                    </div>
                </div>
            </div>
        `;
        return card;
    },

    displayMessages(channel: Channel)
    {
        const messageList = document.getElementById('channel-messages');
        if (!messageList)
            return;
        messageList.innerHTML = channel.message.map(message => this.createMessageCard(message));
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