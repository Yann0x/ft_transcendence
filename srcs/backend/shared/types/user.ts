export interface User {
    id: number;
    username: string;
    email: string;
    avatarUrl: string;
}

export interface UserRegister {
    username: string;
    email: string;
    password_hash: string;
}