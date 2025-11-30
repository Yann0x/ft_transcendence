import { User } from "./user.js";
// example a addapter 

export interface Game {
    id: number;
    player1Id: User;
    player2Id: User;
    player1Score: number;
    player2Score: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Ball {
    x: number;
    y: number;
    radius: number;
    velocityX: number;
    velocityY: number;
}

export interface Paddle {
    y: number;
    width: number;
    speed: number;
}

export interface GameState {
    ball: Ball;
    paddle1: Paddle;
    paddle2: Paddle;
}
