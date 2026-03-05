import type {
  ClientToServerMessage,
  ServerToClientMessage,
} from "../../shared/protocol/wsMessages";

interface WsClientHandlers {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: ServerToClientMessage) => void;
}

export class WsClient {
  private socket: WebSocket | null = null;
  private handlers: WsClientHandlers = {};

  public setHandlers(handlers: WsClientHandlers): void {
    this.handlers = handlers;
  }

  public connect(url: string): void {
    if (this.socket && (this.socket.readyState === 0 || this.socket.readyState === 1)) {
      return;
    }

    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      this.handlers.onOpen?.();
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as ServerToClientMessage;
        this.handlers.onMessage?.(parsed);
      } catch {
        // Ignore malformed payloads.
      }
    };

    socket.onerror = (error) => {
      this.handlers.onError?.(error);
    };

    socket.onclose = () => {
      this.socket = null;
      this.handlers.onClose?.();
    };
  }

  public send(message: ClientToServerMessage): boolean {
    if (!this.socket || this.socket.readyState !== 1) {
      return false;
    }

    this.socket.send(JSON.stringify(message));
    return true;
  }

  public disconnect(): void {
    if (!this.socket) {
      return;
    }
    this.socket.close();
    this.socket = null;
  }
}
