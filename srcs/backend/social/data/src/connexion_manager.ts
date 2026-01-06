import {UserPublic, SocialEvent}  from './shared/with_front/types'
import { WebSocket } from '@fastify/websocket';

export class ConnexionManager {
    private static instance: ConnexionManager
    private connected: Map <UserPublic.id, WebSocket> = new Map();

    private constructor() {}

    public static getInstance(): ConnexionManager {
        if (!ConnexionManager.instance)
            ConnexionManager.instance = new ConnexionManager();
        return ConnexionManager.instance
    }

    public addConnected(user_id: UserPublic.id, socket: WebSocket)
    {
       console.log(`[SOCIAL] Add ${user_id} to connected users`)
       this.connected.set(user_id, socket)
    }

    public removeConnected(user_id: UserPublic.id)
    {
       console.log(`[SOCIAL] Delete ${user_id} of connected users`)
        this.connected.delete(user_id)
    }

    public getCount () {
        return this.connected.size;
    }

    public getAllConnectedUserIds(): string[] {
        return Array.from(this.connected.keys());
    }

    public sendToUser(user_id: UserPublic.id, event: any) {
       console.log(`[SOCIAL] Send to ${user_id} : ${event}`)
        const socket = this.connected.get(user_id);
        if (socket && socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify(event));
        }
    }
    public sendToAll(event: SocialEvent) {
       console.log(`[SOCIAL] Send to all : ${event}`)
        this.connected.forEach((socket) => {
        if (socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify(event));
        }
     })
    }

}
