class Match {
    constructor(
        public id: string,
        public player1Id: string,
        public player2Id: string,
        public score1: number,
        public score2: number,
        public status: 'pending' | 'ongoing' | 'completed',
    ) {}

}

class Tounament {
    constructor(
        public id: string,
        public name: string,
        public participants: string[],
        public status: 'upcoming' | 'ongoing' | 'completed',
        public matches: Match[],
    ) {}
}

class Stats {
    constructor(
        public userId: string,
        public gamesPlayed: number,
        public gamesWon: number,
        public gamesLost: number,
        public winRate: number,
    ) {}
}

class Chat {
    constructor(
        public id: string,
        public name: string,
        public isPrivate: boolean,
        public members: string[],
    ) {}
}