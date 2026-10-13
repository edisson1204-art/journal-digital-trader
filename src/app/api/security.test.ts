/**
 * Controles de seguridad de las rutas de API (pruebas de unidad con Supabase simulado).
 * NO sustituyen la prueba de aislamiento A/B contra una base real (ver audit/security-review.md).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const invite = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { auth: { admin: { inviteUserByEmail: (...a: unknown[]) => invite(...a) } } },
}));

const getUser = vi.fn();
vi.mock("@/utils/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: () => getUser() } }),
}));

const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

describe("Webhook Systeme", () => {
  const OLD = process.env.SYSTEME_WEBHOOK_SECRET;
  beforeEach(() => { invite.mockReset(); invite.mockResolvedValue({ data: { user: { id: "u1" } }, error: null }); });
  afterEach(() => { process.env.SYSTEME_WEBHOOK_SECRET = OLD; });

  it("SEC-01 sin secreto configurado: rechaza (503) y NO crea usuarios", async () => {
    delete process.env.SYSTEME_WEBHOOK_SECRET;
    const { POST } = await import("@/app/api/webhooks/systeme/route");
    const res = await POST(post("http://x/api", { email: "a@b.com" }));
    expect(res.status).toBe(503);
    expect(invite).not.toHaveBeenCalled();
  });

  it("SEC-02 secreto incorrecto o ausente: 401 y no crea usuarios", async () => {
    process.env.SYSTEME_WEBHOOK_SECRET = "correcto";
    const { POST } = await import("@/app/api/webhooks/systeme/route");
    expect((await POST(post("http://x/api", { email: "a@b.com" }, { "x-webhook-secret": "incorrecto" }))).status).toBe(401);
    expect((await POST(post("http://x/api", { email: "a@b.com" }))).status).toBe(401);
    expect(invite).not.toHaveBeenCalled();
  });

  it("SEC-03 secreto correcto: procesa; el email no se imprime en logs", async () => {
    process.env.SYSTEME_WEBHOOK_SECRET = "correcto";
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { POST } = await import("@/app/api/webhooks/systeme/route");
    const res = await POST(post("http://x/api", { email: "persona@example.com" }, { "x-webhook-secret": "correcto" }));
    expect(res.status).toBe(200);
    expect(invite).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(spy.mock.calls)).not.toContain("persona@example.com");
    spy.mockRestore();
  });
});

describe("API /api/chat", () => {
  it("SEC-04 sin sesión: 401 antes de leer la clave o llamar a OpenAI", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(post("http://x/api/chat", { messages: [{ role: "user", content: "hola" }] }, { "x-openai-key": "sk-test" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/Sesión/);
  });

  it("SEC-05 con sesión pero sin clave BYOK: 401 con mensaje de clave", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(post("http://x/api/chat", { messages: [{ role: "user", content: "hola" }] }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/API Key/);
  });

  it("SEC-06 rechaza payloads fuera de límites (demasiados mensajes)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { POST } = await import("@/app/api/chat/route");
    const messages = Array.from({ length: 41 }, () => ({ role: "user", content: "x" }));
    const res = await POST(post("http://x/api/chat", { messages }, { "x-openai-key": "sk-test" }));
    expect(res.status).toBe(400);
  });

  it("SEC-07 el header Authorization ya no se acepta como clave de OpenAI", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(post("http://x/api/chat", { messages: [{ role: "user", content: "hola" }] }, { Authorization: "Bearer sk-test" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/API Key/);
  });
});
