/* SOCIAL CLIENT */

import { SocialEvent } from '../shared/types';

/* TYPES */

export type SocialEventHandler = (event: SocialEvent) => void;

/* SINGLETON */

export const socialClient = (() => {
  let ws: WebSocket | null = null;
  let token: string | null = null;
  let authenticated = false;
  const eventHandlers: Map<string, Set<SocialEventHandler>> = new Map();

  /* CONNECTION */

  function connect(newToken: string): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('[SOCIAL-CLIENT] Already connected');
      return;
    }
    token = newToken;
    authenticated = false;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/social/wss`;
    console.log('[SOCIAL-CLIENT] Connecting to', wsUrl);
    try {
      ws = new WebSocket(wsUrl, [`Bearer.${token}`]);
      ws.addEventListener('open', () => {
        console.log('[SOCIAL-CLIENT] WebSocket connected and authenticated by proxy');
      });
      ws.addEventListener('message', (event) => {
        console.log('[SOCIAL-CLIENT] Message received:', event.data);
        try {
          const socialEvent = JSON.parse(event.data) as SocialEvent;
          handleEvent(socialEvent);
        } catch (error) {
          console.error('[SOCIAL-CLIENT] Error parsing message:', error);
        }
      });
      ws.addEventListener('close', () => {
        console.log('[SOCIAL-CLIENT] WebSocket disconnected');
        authenticated = false;
      });
      ws.addEventListener('error', (error) => {
        console.error('[SOCIAL-CLIENT] WebSocket error:', error);
      });
    } catch (error) {
      console.error('[SOCIAL-CLIENT] Error creating WebSocket:', error);
    }
  }

  function disconnect(): void {
    if (ws) {
      ws.close();
      ws = null;
    }
    authenticated = false;
  }

  /* MESSAGING */

  function send(event: SocialEvent): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('[SOCIAL-CLIENT] Cannot send, WebSocket not connected');
      return;
    }
    ws.send(JSON.stringify(event));
  }

  /* EVENT HANDLING */

  function handleEvent(event: SocialEvent): void {
    console.log('[SOCIAL-CLIENT] Received event:', event.type, event);
    if (event.type === 'connected') {
      authenticated = true;
      console.log('[SOCIAL-CLIENT] Connected and authenticated successfully');
    }
    const handlers = eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[SOCIAL-CLIENT] Error in handler for ${event.type}:`, error);
        }
      });
    }
    const wildcardHandlers = eventHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('[SOCIAL-CLIENT] Error in wildcard handler:', error);
        }
      });
    }
  }

  function on(eventType: string, handler: SocialEventHandler): void {
    if (!eventHandlers.has(eventType)) {
      eventHandlers.set(eventType, new Set());
    }
    eventHandlers.get(eventType)!.add(handler);
  }

  function off(eventType: string, handler: SocialEventHandler): void {
    const handlers = eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /* STATUS */

  function isConnected(): boolean {
    return ws !== null && ws.readyState === WebSocket.OPEN && authenticated;
  }

  /* EXPORT */

  return {
    connect,
    disconnect,
    send,
    on,
    off,
    isConnected,
  };
})();
