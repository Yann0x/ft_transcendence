export class User {
    constructor 
    (
        public role: 'guest' | 'user' | 'admin' = 'guest',
        public id?: string,
        public name?: string,
        public email?: string,
        public avatar?: string,
        public password?: string,
        public friends : UserPublic[] = [],
    ) {}
}

export type UserQuery = Partial<Omit<User, 'password'>>;
export type UserQueryResponse = Omit<User, 'password'>;
export type UserUpdate = Pick<User, 'id' | 'name' | 'email' | 'avatar' | 'password'>; 
export type UserPublic = Omit<User, 'email' | 'password'>;
export type SenderIdentity = Pick<User, 'id' | 'name' | 'email'>;
export type UserRegister = Pick<User, 'id' |'name' | 'email' | 'password' | 'avatar'>;