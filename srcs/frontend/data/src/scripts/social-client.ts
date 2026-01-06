import { SocialEvent } from '../shared/types';

export type SocialEventHandler = (event: SocialEvent) => void;

export class SocialClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private authenticated = false;
  private eventHandlers: Map<string, Set<SocialEventHandler>> = new Map();

  connect(token: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[SOCIAL-CLIENT] Already connected');
      return;
    }

    this.token = token;
    this.authenticated = false;

    const wsUrl = `wss://${window.location.host}/social/wss`;

    console.log('[SOCIAL-CLIENT] Connecting to', wsUrl);

    try {
      // Pass the JWT token as a subprotocol - proxy will handle authentication
      this.ws = new WebSocket(wsUrl, [`Bearer.${token}`]);

      this.ws.addEventListener('open', () => {
        console.log('[SOCIAL-CLIENT] WebSocket connected and authenticated by proxy');
      });

      this.ws.addEventListener('message', (event) => {
        console.log('[SOCIAL-CLIENT] Message received:', event.data);
        try {
          const socialEvent = JSON.parse(event.data) as SocialEvent;
          this.handleEvent(socialEvent);
        } catch (error) {
          console.error('[SOCIAL-CLIENT] Error parsing message:', error);
        }
      });

      this.ws.addEventListener('close', () => {
        console.log('[SOCIAL-CLIENT] WebSocket disconnected');
        this.authenticated = false;
      });

      this.ws.addEventListener('error', (error) => {
        console.error('[SOCIAL-CLIENT] WebSocket error:', error);
      });

    } catch (error) {
      console.error('[SOCIAL-CLIENT] Error creating WebSocket:', error);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.authenticated = false;
  }

  private send(event: SocialEvent): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[SOCIAL-CLIENT] Cannot send, WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify(event));
  }

  private handleEvent(event: SocialEvent): void {
    console.log('[SOCIAL-CLIENT] Received event:', event.type, event);
    if (event.type === 'connected') {
      this.authenticated = true;
      console.log('[SOCIAL-CLIENT] Connected and authenticated successfully');
    }

    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[SOCIAL-CLIENT] Error in handler for ${event.type}:`, error);
        }
      });
    }

    // Also notify wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*');
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

  /**
   * Register an event handler
   */
  on(eventType: string, handler: SocialEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  }

  /**
   * Unregister an event handler
   */
  off(eventType: string, handler: SocialEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.authenticated;
  }
}

// Singleton instance
export const socialClient = new SocialClient();
