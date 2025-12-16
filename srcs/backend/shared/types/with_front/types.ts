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

export class Tounament {
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
        public userId: User["id"],
        public gamesPlayed: number,
        public gamesWon: number,
        public gamesLost: number,
        public winRate: number,
    ) {}
}

export class Channel {
    constructor(
        public id: number,
        public name: string,
        public type: 'public' | 'private' = 'private',
        public members: User["id"][],
        public moderators: User["id"][],
        public createdAt: Date,
        public createdBy: User["id"],
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
        public tournaments?: Tounament[],
        public chats?: Channel[],
    ) {}
}
export type UserPublic = Pick<User, 'id' | 'name' | 'avatar' | 'friends'>;

