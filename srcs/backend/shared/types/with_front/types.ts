export interface Match {
    
        id: string,
        player1Id: User["id"],
        player2Id: User["id"],
        score1: number,
        score2: number,
        status: string,
}

export interface Tournament {
    
        id: string,
        name: string,
        participants: User["id"][],
        status: string,
        matches: Match[],
}

export interface Stats {
        user_id: User["id"],
        games_played: number,
        games_won: number,
        games_lost: number,
        win_rate: number,
}
export interface Message {
    
        id: number,
        channel_id: Channel["id"],
        sender_id: User["id"],
        content: string,
        sent_at: Date,
}

export interface Channel {
    
        id: number,
        name: string,
        type: string,
        members: User["id"][],
        moderators: User["id"][],
        messages: Message[],
        created_by: User["id"],
        created_at: Date,
}

export interface User {
        role: string,
        id?: string,
        name: string,
        email?: string,
        avatar?: string,
        password?: string,
        friends : UserPublic[],
        stats?: Stats,
        matches?: Match[],
        tournaments?: Tournament[],
        chats?: Channel[],
}

export type UserPublic= Pick<User, 'id' | 'name' | 'avatar' | 'friends'>;

