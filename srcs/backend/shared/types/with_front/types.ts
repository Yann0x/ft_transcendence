export class Match {
    constructor(
        public id: string,
        public player1Id: User["id"],
        public player2Id: User["id"],
        public score1: number,
        public score2: number,
        public status: 'pending' | 'ongoing' | 'completed',
    ) {}

}

export class Tournament {
    constructor(
        public id: string,
        public name: string,
        public participants: User["id"][],
        public status: 'upcoming' | 'ongoing' | 'completed',
        public matches: Match[],
    ) {}
}

export class Stats {
    constructor(
        public user_id: User["id"],
        public games_played: number,
        public games_won: number,
        public games_lost: number,
        public win_rate: number,
    ) {}
}
export class Message {
    constructor(
        public id: number,
        public channel_id: Channel["id"],
        public sender_id: User["id"],
        public content: string,
        public sent_at: Date,
    ) {}
}

export class Channel {
    constructor(
        public id: number,
        public name: string,
        public type: 'public' | 'private' = 'private',
        public members: User["id"][],
        public moderators: User["id"][],
        public messages: Message[],
        public created_by: User["id"],
        public created_at: Date,
    ) {}
}

export class User {
    constructor 
    (
        public role: 'guest' | 'user' | 'admin' = 'guest',
        public id?: string,
        public name: string | 'guest' = 'guest',
        public email?: string,
        public avatar?: string,
        public password?: string,
        public friends : UserPublic[] = [],
        public stats?: Stats,
        public matches?: Match[],
        public tournaments?: Tournament[],
        public chats?: Channel[],
    ) {}
}
export type UserPublic = Pick<User, 'id' | 'name' | 'avatar' | 'friends'>;

