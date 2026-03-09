import type {
  ClientToServerMessage,
  ServerToClientMessage,
} from "../../shared/protocol/wsMessages";

interface WsClientHandlers {
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
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
        console.warn("[ws] ignoring malformed message payload");
      }
    };

    socket.onerror = (error) => {
      console.warn("[ws] socket error");
      this.handlers.onError?.(error);
    };

    socket.onclose = (event) => {
      this.socket = null;
      this.handlers.onClose?.(event);
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
