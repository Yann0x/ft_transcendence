import { randomBytes } from "crypto";

export class User {
    constructor 
    (
        public role: 'guest' | 'user' | 'admin' = 'guest',
        public id?: string,
        public name?: string,
        public email?: string,
        public avatar?: string,
        public password?: string,
    ) {}

    getPublicData(): {name: string | undefined; avatar: string | undefined} {
        return {
            name: this.name,
            avatar: this.avatar
        }
    }
    getRegisterData(): UserRegister  {
        if (!this.name || !this.email || !this.password) {
            throw new Error('Name, email, and password are required for a valid User registration.');
        }
        return {
            name: this.name,
            email: this.email,
            password: this.password,
            avatar: this.avatar
        }
    }

    register(): string | null {
        //TODO create an ID for the user
        //Check if user with same email already exists
        try {
            const result = fetch('http://databse:3000/user', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(this.getRegisterData())
            });
            if (!result) {
                throw new Error('databse registration failed.');
            }
            if  (this.role === 'guest')
                this.role = 'user';
        } catch (error) {
            console.error('Error during user registration:', error);
            return null;
        }
        // TODO create a JWT token for the user
        return randomBytes(16).toString('hex');
    }
}

export type UserQuery = Partial<Omit<User, 'password'>>;
export type UserQueryResponse = Omit<User, 'password'>;
export type UserUpdate = Pick<User, 'id' | 'name' | 'email' | 'avatar' | 'password'>; 
export type UserPublic = Omit<User, 'email' | 'password'>;
export type SenderIdentity = Pick<User, 'id' | 'name' | 'email'>;
export type UserRegister = Pick<User, 'id' |'name' | 'email' | 'password' | 'avatar'>;