import {UserPublic, SocialEvent}  from './shared/with_front/types'
import { WebSocket } from '@fastify/websocket';

interface ConnectedUser {
    user: UserPublic;
    socket: WebSocket;
}

export class ConnexionManager {
    private static instance: ConnexionManager
    private connected: Map<UserPublic.id, ConnectedUser> = new Map();

    private constructor() {}

    public static getInstance(): ConnexionManager {
        if (!ConnexionManager.instance)
            ConnexionManager.instance = new ConnexionManager();
        return ConnexionManager.instance
    }

    public addConnected(user: UserPublic, socket: WebSocket)
    {
       console.log(`[SOCIAL] Add ${user.id} to connected users`)
       this.connected.set(user.id!, { user, socket })
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

    public getAllConnectedUsers(): UserPublic[] {
        return Array.from(this.connected.values()).map(c => c.user);
    }

    public sendToUser(user_id: UserPublic.id, event: any) {
       console.log(`[SOCIAL] Send to ${user_id} : ${event}`)
        const connectedUser = this.connected.get(user_id);
        if (connectedUser && connectedUser.socket.readyState === connectedUser.socket.OPEN) {
            connectedUser.socket.send(JSON.stringify(event));
        }
    }
    public sendToAll(event: SocialEvent) {
       console.log(`[SOCIAL] Send to all : ${event}`)
        this.connected.forEach((connectedUser) => {
        if (connectedUser.socket.readyState === connectedUser.socket.OPEN) {
            connectedUser.socket.send(JSON.stringify(event));
        }
     })
    }

}
