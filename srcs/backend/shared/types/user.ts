export interface User {
    id: number;
    name: string;
    email: string;
    passwordHash: string;
    avatar?: string;
}

export type UserLogin = Pick<User, 'email'> & {password: string};
export type UserRegister = Pick<User, 'name' | 'email' | 'avatar'> & {password: string};
export type UserQuery = Partial<Omit<User, 'passwordHash'>>;
export type UserQueryResponse = Omit<User, 'passwordHash'>;
export type UserUpdate = {id: number} & Partial<Pick<User, 'name' | 'email' | 'avatar' | 'passwordHash'>>;
export type UserPublic = Omit<User, 'email' | 'passwordHash'>;
export type SenderIdentity = Pick<User, 'id' | 'name' | 'email'>;