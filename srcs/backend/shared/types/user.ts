export interface User {
    id: number;
    username: string;
    email: string;
    avatarUrl: string;
}

export interface Register {
    username: string;
    email: string;
    password_hash: string;
}