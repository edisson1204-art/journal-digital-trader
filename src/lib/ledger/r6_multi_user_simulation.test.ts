import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getSessionMock,
  signOutMock,
  updateUserMock,
  selectEqMock,
  deleteEqMock,
  upsertMock,
  insertMock,
  fromMock,
} = vi.hoisted(() => {
  const selectEq = vi.fn();
  const deleteEq = vi.fn();
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({
    select: vi.fn(() => ({ eq: selectEq })),
    delete: vi.fn(() => ({ eq: deleteEq })),
    upsert,
    insert,
  }));
  const getSession = vi.fn().mockResolvedValue({ data: { session: null } });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const updateUser = vi.fn().mockResolvedValue({ data: {}, error: null });
  return {
    getSessionMock: getSession,
    signOutMock: signOut,
    updateUserMock: updateUser,
    selectEqMock: selectEq,
    deleteEqMock: deleteEq,
    upsertMock: upsert,
    insertMock: insert,
    fromMock: from,
  };
});

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...a: unknown[]) => getSessionMock(...a),
      signOut: (...a: unknown[]) => signOutMock(...a),
      updateUser: (...a: unknown[]) => updateUserMock(...a),
    },
    from: (...a: unknown[]) => (fromMock as any)(...a),
  },
}));

import { useTradeStore } from "@/store/tradeStore";
import { useSettingsStore } from "@/store/settingsStore";
import { logout } from "@/lib/auth/logout";
import { extractCodeFromInput } from "@/app/reset-password/page";
import { POST as ownerLoginPost } from "@/app/api/auth/owner-login/route";
import { calculateTradeFromFills, INSTRUMENT_POINT_VALUES, type TradeRecord } from "@/lib/tradeTypes";

function makeSimTrade(params: {
  id: string;
  instrument: "MNQ" | "MES";
  side: "Buy" | "Sell";
  contracts: number;
  entry: number;
  exit: number;
  stop: number;
  tag: string;
}): TradeRecord {
  const pv = INSTRUMENT_POINT_VALUES[params.instrument] ?? 2;
  const entries = [{ price: params.entry, contracts: params.contracts }];
  const exits = [{ price: params.exit, contracts: params.contracts }];
  const calc = calculateTradeFromFills(params.side, entries, exits, params.stop, 0.09, pv);
  return {
    ...calc,
    id: params.id,
    dateOpen: "2026-11-05",
    timeOpen: "09:35",
    dateClose: "2026-11-05",
    timeClose: "10:05",
    instrument: params.instrument,
    assetClass: "Futures_Micro",
    side: params.side,
    entries,
    exits,
    avgEntryPrice: calc.avgEntryPrice ?? params.entry,
    totalContracts: params.contracts,
    contractsExited: params.contracts,
    stopLoss: params.stop,
    initialStopLoss: params.stop,
    brokerId: "my_funded_futures",
    commissionPerSide: 0.09,
    totalCommission: calc.totalCommission ?? 0,
    result: calc.result ?? "Open",
    isBreakeven: calc.isBreakeven ?? false,
    isFundedAccount: true,
    strategy: "ICT Silver Bullet",
    setup: "FVG",
    setupGrade: "A+",
    confluenceCount: 4,
    session: "NYSE Open (9:30-11)",
    emotionEntry: "Disciplinado",
    planFollowed: true,
    tags: [params.tag],
    notes: "",
  };
}

describe("R6 — Simulación Multi-Usuario (Aislamiento Usuario A vs Usuario B, Recuperación y Seguridad)", () => {
  const USER_A_ID = "aaaa1111-1111-4111-8111-111111111111";
  const USER_B_ID = "bbbb2222-2222-4222-8222-222222222222";

  const userATrades: TradeRecord[] = [
    makeSimTrade({
      id: "11111111-aaaa-4111-8111-000000000001",
      instrument: "MNQ",
      side: "Buy",
      contracts: 4,
      entry: 20000,
      exit: 20040, // +$320 gross - $0.72 comm = +$319.28 net
      stop: 19980,
      tag: "user-a-mffu",
    }),
    makeSimTrade({
      id: "11111111-aaaa-4111-8111-000000000002",
      instrument: "MNQ",
      side: "Sell",
      contracts: 3,
      entry: 20100,
      exit: 20060, // +$240 gross - $0.54 comm = +$239.46 net
      stop: 20120,
      tag: "user-a-mffu",
    }),
  ];

  const userBTrades: TradeRecord[] = [
    makeSimTrade({
      id: "22222222-bbbb-4222-8222-000000000001",
      instrument: "MES",
      side: "Buy",
      contracts: 2,
      entry: 5800,
      exit: 5815, // +$150 gross - $0.36 comm = +$149.64 net
      stop: 5790,
      tag: "user-b-topstep",
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.localStorage y window.location en entorno de test
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
      },
      location: {
        replace: vi.fn(),
        origin: "https://journal-digital-trader.vercel.app",
      },
    });
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    });
    // Permitir Object.keys(localStorage)
    Object.defineProperty(globalThis, "localStorage", {
      value: new Proxy(
        {},
        {
          get(_, prop: string) {
            if (prop === "getItem") return (k: string) => store.get(k) ?? null;
            if (prop === "setItem") return (k: string, v: string) => { store.set(k, v); };
            if (prop === "removeItem") return (k: string) => { store.delete(k); };
            return store.get(prop);
          },
          ownKeys() {
            return Array.from(store.keys());
          },
          getOwnPropertyDescriptor(_, prop: string) {
            if (store.has(prop)) {
              return { enumerable: true, configurable: true, value: store.get(prop) };
            }
            return undefined;
          },
        }
      ),
      configurable: true,
    });
  });

  it("MU-01: Aislamiento estricto cuando Usuario B inicia sesión en un navegador donde antes operó Usuario A", async () => {
    // 1. Usuario A estuvo operando en este navegador y dejó sus 2 trades y sus cuentas MFFU en localStorage
    localStorage.setItem("tdi_prop_accounts_v4", JSON.stringify([{ id: "mffu-a", name: "Cuenta de Usuario A" }]));
    localStorage.setItem("tdi_prop_accounts_owner", USER_A_ID);
    useTradeStore.setState({
      trades: userATrades,
      ownerId: USER_A_ID,
      syncError: null,
      syncStatus: "synced",
    });

    expect(useTradeStore.getState().trades).toHaveLength(2);
    expect(useTradeStore.getState().ownerId).toBe(USER_A_ID);

    // 2. Ahora inicia sesión Usuario B y se ejecuta fetchTradesFromCloud()
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: USER_B_ID, email: "laura.quant@demo.com" } } },
    });
    selectEqMock.mockResolvedValue({
      data: userBTrades.map(t => ({ data: t })),
      error: null,
    });

    await useTradeStore.getState().fetchTradesFromCloud();

    // Verificaciones:
    // - NUNCA se subieron los trades locales de Usuario A a la cuenta en la nube de Usuario B
    expect(upsertMock).not.toHaveBeenCalled();
    // - El store ahora pertenece a Usuario B y contiene ÚNICAMENTE el trade de Usuario B
    expect(useTradeStore.getState().ownerId).toBe(USER_B_ID);
    expect(useTradeStore.getState().trades).toHaveLength(1);
    expect(useTradeStore.getState().trades[0].id).toBe(userBTrades[0].id);
    expect(useTradeStore.getState().stats.totalNet).toBe(149.64);
    // - Las cuentas de fondeo locales de Usuario A fueron purgadas automáticamente
    expect(localStorage.getItem("tdi_prop_accounts_v4")).toBeNull();
  });

  it("MU-02: logout() de Usuario A purga el 100% de sus datos locales (incluyendo cuentas de fondeo y API key) sin borrar sus trades en Supabase", async () => {
    localStorage.setItem("trading-intelligence-storage", "datos-usuario-a");
    localStorage.setItem("tdi_prop_accounts_v4", JSON.stringify([{ id: "mffu-1" }]));
    localStorage.setItem("ai-mentor-chat-v1", "historial-chat-privado");
    localStorage.setItem("trading-settings-secured", "clave-ofuscada");
    useTradeStore.setState({ trades: userATrades, ownerId: USER_A_ID });
    useSettingsStore.getState().setOpenAiKey("sk-test-secret-user-a");

    await logout();

    // No debe haber llamado a delete() en Supabase (sus datos en la nube quedan intactos)
    expect(deleteEqMock).not.toHaveBeenCalled();
    // La memoria y localStorage quedan completamente limpios para que Usuario B no vea nada de Usuario A
    expect(useTradeStore.getState().trades).toHaveLength(0);
    expect(useTradeStore.getState().ownerId).toBeNull();
    expect(useSettingsStore.getState().openAiKey).toBe("");
    expect(localStorage.getItem("trading-intelligence-storage")).toBeNull();
    expect(localStorage.getItem("tdi_prop_accounts_v4")).toBeNull();
    expect(localStorage.getItem("ai-mentor-chat-v1")).toBeNull();
  });

  it("MU-03: Resetear Cuenta (clearTrades) de Usuario A borra en Supabase filtrando exclusivamente por USER_A_ID", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: USER_A_ID } } },
    });
    deleteEqMock.mockResolvedValue({ error: null });
    useTradeStore.setState({ trades: userATrades, ownerId: USER_A_ID });

    const ok = await useTradeStore.getState().clearTrades();

    expect(ok).toBe(true);
    expect(deleteEqMock).toHaveBeenCalledWith("user_id", USER_A_ID);
    expect(deleteEqMock).not.toHaveBeenCalledWith("user_id", USER_B_ID);
    expect(updateUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ prop_accounts: [] }),
      })
    );
  });

  it("MU-04: Recuperación de contraseña extrae correctamente códigos PKCE tanto de enlaces de producción como de enlaces localhost", () => {
    const sampleCode = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
    expect(
      extractCodeFromInput(`https://journal-digital-trader.vercel.app/reset-password?code=${sampleCode}`)
    ).toBe(sampleCode);
    expect(
      extractCodeFromInput(`http://localhost:3000/?code=${sampleCode}`)
    ).toBe(sampleCode);
    expect(extractCodeFromInput(sampleCode)).toBe(sampleCode);
    expect(extractCodeFromInput("enlace-sin-codigo")).toBeNull();
  });

  it("MU-05: Endpoint /api/auth/owner-login rechaza a cualquier otro usuario (401) y autoriza únicamente al propietario", async () => {
    const badReq = new Request("https://journal-digital-trader.vercel.app/api/auth/owner-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "cliente.externo@gmail.com", password: "Password123*" }),
    });
    const badRes = await ownerLoginPost(badReq);
    expect(badRes.status).toBe(401);

    const ownerReq = new Request("https://journal-digital-trader.vercel.app/api/auth/owner-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "edisson1204@gmail.com", password: "2704Verd*" }),
    });
    const ownerRes = await ownerLoginPost(ownerReq);
    expect(ownerRes.status).toBe(200);
    const setCookie = ownerRes.headers.get("set-cookie") || "";
    expect(setCookie).toContain("tdi_owner_session=");
    expect(setCookie).toContain("HttpOnly");
  });
});
