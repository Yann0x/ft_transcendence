export class User {
    constructor 
    (
        public role: 'guest' | 'user' | 'admin' = 'guest',
        public id?: string,
        public name?: string,
        public email?: string,
        public avatar?: string,
        private password?: string,
    ) {}

    getPublicData(): {name: string | undefined; avatar: string | undefined} {
        return {
            name: this.name,
            avatar: this.avatar
        }
    }
    getRegisterData(): {name: string | undefined; email: string | undefined; password: string | undefined; avatar?: string | undefined} {
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

    register() {
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
            return result;
        } catch (error) {
            console.error('Error during user registration:', error);
            return null;
        }
    }
}

export type UserQuery = Partial<Omit<User, 'password'>>;
export type UserQueryResponse = Omit<User, 'password'>;
export type UserUpdate = Pick<User, 'name' | 'email' | 'avatar' > & {password?: string};
export type UserPublic = Omit<User, 'email' | 'password'>;
export type SenderIdentity = Pick<User, 'id' | 'name' | 'email'>;