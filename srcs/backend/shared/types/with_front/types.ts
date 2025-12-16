export class Match {
    constructor(
        public id: string,
        public player1Id: string,
        public player2Id: string,
        public score1: number,
        public score2: number,
        public status: 'pending' | 'ongoing' | 'completed',
    ) {}

}

export class Tounament {
    constructor(
        public id: string,
        public name: string,
        public participants: string[],
        public status: 'upcoming' | 'ongoing' | 'completed',
        public matches: Match[],
    ) {}
}

export class Stats {
    constructor(
        public userId: string,
        public gamesPlayed: number,
        public gamesWon: number,
        public gamesLost: number,
        public winRate: number,
    ) {}
}

export class Chat {
    constructor(
        public id: string,
        public name: string,
        public isPrivate: boolean,
        public members: string[],
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
        public chats?: Chat[],
    ) {}
}
export type UserPublic = Pick<User, 'id' | 'name' | 'avatar' | 'friends'>;

