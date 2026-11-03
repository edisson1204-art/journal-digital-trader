import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase simulado: NUNCA toca la base real.
const { eqMock, deleteMock, fromMock, getSessionMock } = vi.hoisted(() => {
  const eq = vi.fn();
  const del = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ delete: del }));
  const getSession = vi.fn().mockResolvedValue({ data: { session: null } });
  return { eqMock: eq, deleteMock: del, fromMock: from, getSessionMock: getSession };
});

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { getSession: (...a: unknown[]) => getSessionMock(...a) },
    from: (...a: unknown[]) => (fromMock as any)(...a),
  },
}));

import { useTradeStore } from "@/store/tradeStore";

const fakeTrades = [
  { id: "11111111-1111-4111-8111-111111111111", netPnl: 100 },
  { id: "22222222-2222-4222-8222-222222222222", netPnl: -50 },
] as any[];

function seed() {
  useTradeStore.setState({ trades: fakeTrades, syncError: null, syncStatus: "synced" } as any);
}

describe("Resetear Cuenta (clearTrades)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seed();
  });

  it("T1: con sesión y nube OK → borra en Supabase filtrando por user_id y vacía lo local", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: "user-abc" } } } });
    eqMock.mockResolvedValue({ error: null });

    const ok = await useTradeStore.getState().clearTrades();

    expect(ok).toBe(true);
    expect(fromMock).toHaveBeenCalledWith("trades");
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-abc");
    expect(useTradeStore.getState().trades).toHaveLength(0);
    expect(useTradeStore.getState().stats.totalTrades).toBe(0);
    expect(useTradeStore.getState().syncError).toBeNull();
  });

  it("T2: si Supabase falla → NO vacía lo local, devuelve false y expone el error", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: "user-abc" } } } });
    eqMock.mockResolvedValue({ error: { message: "permission denied" } });

    const ok = await useTradeStore.getState().clearTrades();

    expect(ok).toBe(false);
    expect(useTradeStore.getState().trades).toHaveLength(2);
    expect(useTradeStore.getState().syncError).toContain("permission denied");
    expect(useTradeStore.getState().syncStatus).toBe("error");
  });

  it("T3: si hay excepción de red → NO vacía lo local y devuelve false", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: "user-abc" } } } });
    eqMock.mockRejectedValue(new Error("network down"));

    const ok = await useTradeStore.getState().clearTrades();

    expect(ok).toBe(false);
    expect(useTradeStore.getState().trades).toHaveLength(2);
  });

  it("T4: sin sesión → no llama a Supabase y vacía solo lo local", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    const ok = await useTradeStore.getState().clearTrades();

    expect(ok).toBe(true);
    expect(deleteMock).not.toHaveBeenCalled();
    expect(useTradeStore.getState().trades).toHaveLength(0);
  });

  it("T5: el delete SIEMPRE está acotado al usuario (nunca borra filas de otros)", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: "user-xyz" } } } });
    eqMock.mockResolvedValue({ error: null });

    await useTradeStore.getState().clearTrades();

    // delete() debe encadenarse con eq("user_id", ...) y no con otro filtro.
    const calls = eqMock.mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(["user_id", "user-xyz"]);
  });
});
