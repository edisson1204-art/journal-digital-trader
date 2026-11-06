import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: () => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user_vip_123", email: "comprador@hotmart.com" } },
          error: null,
        }),
        inviteUserByEmail: vi.fn().mockResolvedValue({
          data: { user: { id: "user_sys_456", email: "comprador@systeme.io" } },
          error: null,
        }),
      },
    },
  },
}));

import { POST as hotmartWebhook } from "@/app/api/webhooks/hotmart/route";
import { POST as checkoutProcess } from "@/app/api/checkout/process/route";

describe("R8 — Estrategia Cero-Dominio: Integración Hotmart + Systeme.io + Checkout + Bienvenida VIP", () => {
  beforeEach(() => {
    process.env.HOTMART_WEBHOOK_SECRET = "secreto_hotmart_test_2026";
  });

  it("1. Rechaza con 401 si el token x-hotmart-hottok es inválido", async () => {
    const req = new Request("https://journal-digital-trader.vercel.app/api/webhooks/hotmart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hotmart-hottok": "token_falso",
      },
      body: JSON.stringify({ event: "PURCHASE_APPROVED" }),
    });
    const res = await hotmartWebhook(req);
    expect(res.status).toBe(401);
  });

  it("2. Procesa una compra aprobada de Hotmart (PURCHASE_APPROVED), crea cuenta VIP y despacha los 2 correos", async () => {
    const req = new Request("https://journal-digital-trader.vercel.app/api/webhooks/hotmart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hotmart-hottok": "secreto_hotmart_test_2026",
      },
      body: JSON.stringify({
        event: "PURCHASE_APPROVED",
        data: {
          buyer: {
            email: "comprador@hotmart.com",
            name: "Carlos Operador",
          },
          purchase: {
            transaction: "HP179400998877",
          },
        },
      }),
    });

    const res = await hotmartWebhook(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.provider).toBe("hotmart");
    expect(json.email).toBe("comprador@hotmart.com");
    expect(json.transaction_id).toBe("HP179400998877");
    expect(json.emailsDispatched).toHaveLength(2);
  });

  it("3. Procesa una orden desde /api/checkout/process, genera ID de transacción y devuelve la redirección hacia /bienvenida-vip", async () => {
    const req = new Request("https://journal-digital-trader.vercel.app/api/checkout/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Edisson Trader",
        email: "edisson1204@gmail.com",
        plan: "anual",
        method: "hotmart",
      }),
    });

    const res = await checkoutProcess(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.transactionId).toContain("ORD-ANUAL-");
    expect(json.redirectUrl).toContain("/bienvenida-vip?email=edisson1204%40gmail.com");
  });
});
