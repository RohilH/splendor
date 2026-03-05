interface ReconnectManagerOptions {
  reconnectGraceMs: number;
  idleRoomTtlMs: number;
}

export class ReconnectManager {
  private readonly emptySinceByRoom = new Map<string, number>();
  private readonly options: ReconnectManagerOptions;

  public constructor(options: ReconnectManagerOptions) {
    this.options = options;
  }

  public markRoomConnected(roomCode: string): void {
    this.emptySinceByRoom.delete(roomCode);
  }

  public markRoomEmpty(roomCode: string, now: number): void {
    if (!this.emptySinceByRoom.has(roomCode)) {
      this.emptySinceByRoom.set(roomCode, now);
    }
  }

  public shouldExpireRoom(
    roomCode: string,
    isLiveGame: boolean,
    now: number
  ): boolean {
    const emptySince = this.emptySinceByRoom.get(roomCode);
    if (emptySince === undefined) {
      return false;
    }

    const ttlMs = isLiveGame
      ? this.options.reconnectGraceMs
      : this.options.idleRoomTtlMs;
    return now - emptySince >= ttlMs;
  }

  public clearRoom(roomCode: string): void {
    this.emptySinceByRoom.delete(roomCode);
  }
}
