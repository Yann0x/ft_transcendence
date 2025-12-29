/* ============================================
   SOCIAL CLIENT - WebSocket Client for Real-Time Social Features
   ============================================ */

import { SocialEvent } from '../shared/types';

export type SocialEventHandler = (event: SocialEvent) => void;

/**
 * WebSocket client for real-time social features
 */
export class SocialClient {
  private ws: WebSocket | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private token: string | null = null;
  private authenticated = false;
  private eventHandlers: Map<string, Set<SocialEventHandler>> = new Map();

  /**
   * Connect to the social service WebSocket
   */
  connect(token: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[SOCIAL] Already connected');
      return;
    }

    this.token = token;
    this.authenticated = false;

    // Use wss:// for secure WebSocket connection
    // Pass token as Authorization header via subprotocol (browser limitation workaround)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/social/wss`;

    console.log('[SOCIAL] Connecting to', wsUrl);

    try {
      // Pass the JWT token as a subprotocol - proxy will handle authentication
      this.ws = new WebSocket(wsUrl, [`Bearer.${token}`]);

      this.ws.addEventListener('open', () => {
        console.log('[SOCIAL] WebSocket connected and authenticated by proxy');
        this.reconnectAttempts = 0;
        // No need to send auth message - proxy already authenticated us
      });

      this.ws.addEventListener('message', (event) => {
        try {
          const socialEvent = JSON.parse(event.data) as SocialEvent;
          this.handleEvent(socialEvent);
        } catch (error) {
          console.error('[SOCIAL] Error parsing message:', error);
        }
      });

      this.ws.addEventListener('close', () => {
        console.log('[SOCIAL] WebSocket disconnected');
        this.authenticated = false;
        this.scheduleReconnect();
      });

      this.ws.addEventListener('error', (error) => {
        console.error('[SOCIAL] WebSocket error:', error);
      });

    } catch (error) {
      console.error('[SOCIAL] Error creating WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the social service
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.authenticated = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Send an event to the server
   */
  private send(event: SocialEvent): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[SOCIAL] Cannot send, WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify(event));
  }

  /**
   * Handle incoming events
   */
  private handleEvent(event: SocialEvent): void {
    console.log('[SOCIAL] Received event:', event.type, event);

    // Handle connection confirmation from server
    if (event.type === 'connected') {
      this.authenticated = true;
      console.log('[SOCIAL] Connected and authenticated successfully');
    } else if (event.type === 'error' && event.data?.reason?.includes('Unauthorized')) {
      console.error('[SOCIAL] Authentication failed:', event.data);
      this.disconnect();
      return;
    }

    // Notify registered handlers
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[SOCIAL] Error in handler for ${event.type}:`, error);
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
          console.error('[SOCIAL] Error in wildcard handler:', error);
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

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SOCIAL] Max reconnect attempts reached');
      return;
    }

    if (!this.token) {
      console.log('[SOCIAL] No token, not reconnecting');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`[SOCIAL] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect(this.token!);
    }, delay);
  }

  /**
   * Check if the client is connected and authenticated
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.authenticated;
  }
}

// Singleton instance
export const socialClient = new SocialClient();
