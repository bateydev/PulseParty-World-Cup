/**
 * WebSocket Connection Manager with Exponential Backoff Reconnection
 * Requirements: 7.6, 7.7
 */

interface ConnectionConfig {
  url: string;
  userId?: string;
  roomId?: string;
  locale?: string;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnectFailed?: () => void;
}

interface SessionState {
  userId?: string;
  roomId?: string;
  locale?: string;
}

export class WebSocketConnectionManager {
  private ws: WebSocket | null = null;
  private config: ConnectionConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeoutId: number | null = null;
  private isIntentionallyClosed = false;
  private sessionState: SessionState = {};

  constructor(config: ConnectionConfig) {
    this.config = config;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 5;
    
    // Store session state for reconnection
    this.sessionState = {
      userId: config.userId,
      roomId: config.roomId,
      locale: config.locale,
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    this.isIntentionallyClosed = false;

    // Build connection URL with query parameters
    const url = this.buildConnectionUrl();

    console.log('Connecting to WebSocket:', url);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.clearReconnectTimeout();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send message to WebSocket server
   */
  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Update session state (for reconnection)
   */
  updateSessionState(state: Partial<SessionState>): void {
    this.sessionState = { ...this.sessionState, ...state };
  }

  /**
   * Get current connection state
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Build WebSocket connection URL with query parameters
   */
  private buildConnectionUrl(): string {
    const url = new URL(this.config.url);
    
    if (this.sessionState.userId) {
      url.searchParams.set('userId', this.sessionState.userId);
    }
    
    if (this.sessionState.roomId) {
      url.searchParams.set('roomId', this.sessionState.roomId);
    }
    
    if (this.sessionState.locale) {
      url.searchParams.set('locale', this.sessionState.locale);
    }

    return url.toString();
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.config.onOpen?.();
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket closed:', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });

    this.config.onClose?.();

    // Attempt reconnection if not intentionally closed
    if (!this.isIntentionallyClosed) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.config.onMessage?.(data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.config.onError?.(event);
  }

  /**
   * Schedule reconnection with exponential backoff
   * Backoff formula: delay = 1000ms * (2 ^ attempt)
   * Attempts: 1s, 2s, 4s, 8s, 16s
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `Max reconnection attempts (${this.maxReconnectAttempts}) reached`
      );
      this.config.onReconnectFailed?.();
      return;
    }

    this.reconnectAttempts++;

    // Calculate exponential backoff delay
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 16000);

    console.log(
      `Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    );

    this.config.onReconnecting?.(this.reconnectAttempts);

    this.reconnectTimeoutId = window.setTimeout(() => {
      console.log(`Reconnection attempt ${this.reconnectAttempts}`);
      this.connect();
    }, delay);
  }

  /**
   * Clear reconnection timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }
}
