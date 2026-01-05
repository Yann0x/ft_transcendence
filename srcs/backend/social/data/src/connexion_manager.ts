import {UserPublic}  from './shared/with_front/types'

export class UserManager {
    private static instance: UserManager
    static #connected: UserPublic[];

    private constructor() {}

    public static getInstance(): UserManager {
        if (!UserManager.instance)
            UserManager.instance = new UserManager();
        return UserManager.instance
    }

    public addConnected(user: UserPublic)
    {
       UserManager.#connected.push(user)
    }

    public removeConnected(user: UserPublic)
    {
        UserManager.#connected = UserManager.#connected.filter(u => u.id !== user.id)
    }

    public static getCount () {
        return UserManager.#connected.length;
    }
}
