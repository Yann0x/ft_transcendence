import {UserPublic}  from './shared/with_front/types'
import { SocketStream } from '@fastify/websocket';
import { Type } from '@sinclair/typebox';

export class ConnexionManager {
    private static instance: ConnexionManager
    private connected: Map <UserPublic.id, SocketStream> = new Map();

    private constructor() {}

    public static getInstance(): ConnexionManager {
        if (!ConnexionManager.instance)
            ConnexionManager.instance = new ConnexionManager();
        return ConnexionManager.instance
    }

    public addConnected(user_id: UserPublic.id, socket: SocketStream)
    {
       this.connected.set(user_id, socket)
    }

    public removeConnected(user_id: UserPublic.id)
    {
        this.connected.delete(user_id)
    }

    public static getCount () {
        return this.connected.size;
    }
    
    public sendToUser(user_id: UserPublic.id, event: any) {
        const socket = this.connected.get(user_id);
        if (socket && socket.socket.readyState === socket.socket.OPEN) {
            socket.socket.send(JSON.stringify(event));
        }
    }
}
