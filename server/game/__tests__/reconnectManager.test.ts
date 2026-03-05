import { describe, expect, it } from "vitest";
import { ReconnectManager } from "../reconnectManager";

describe("ReconnectManager", () => {
  it("expires idle rooms after idle TTL", () => {
    const manager = new ReconnectManager({
      reconnectGraceMs: 10_000,
      idleRoomTtlMs: 2_000,
    });

    manager.markRoomEmpty("ROOM1", 1_000);

    expect(manager.shouldExpireRoom("ROOM1", false, 2_999)).toBe(false);
    expect(manager.shouldExpireRoom("ROOM1", false, 3_000)).toBe(true);
  });

  it("uses reconnect grace for live games", () => {
    const manager = new ReconnectManager({
      reconnectGraceMs: 5_000,
      idleRoomTtlMs: 1_000,
    });

    manager.markRoomEmpty("ROOM2", 10_000);

    expect(manager.shouldExpireRoom("ROOM2", true, 14_999)).toBe(false);
    expect(manager.shouldExpireRoom("ROOM2", true, 15_000)).toBe(true);
  });

  it("clears empty state when room reconnects", () => {
    const manager = new ReconnectManager({
      reconnectGraceMs: 5_000,
      idleRoomTtlMs: 1_000,
    });

    manager.markRoomEmpty("ROOM3", 1_000);
    manager.markRoomConnected("ROOM3");

    expect(manager.shouldExpireRoom("ROOM3", false, 100_000)).toBe(false);
  });

  it("supports explicit room cleanup", () => {
    const manager = new ReconnectManager({
      reconnectGraceMs: 5_000,
      idleRoomTtlMs: 1_000,
    });

    manager.markRoomEmpty("ROOM4", 500);
    manager.clearRoom("ROOM4");

    expect(manager.shouldExpireRoom("ROOM4", false, 10_000)).toBe(false);
  });
});
