import { describe, it, expect } from "vitest";
import {
  dispatchAllSevenEmailsSimulation,
  dispatchTraderEmail,
} from "@/lib/emailDispatcher";

describe("R7 — Simulación Integral de Envío de los 7 Correos a edisson1204@gmail.com", () => {
  const OWNER_EMAIL = "edisson1204@gmail.com";

  it("1. Envía de forma simulada los 7 correos del ciclo de vida a edisson1204@gmail.com con 100% de éxito", async () => {
    const results = await dispatchAllSevenEmailsSimulation(OWNER_EMAIL, "Edisson");
    expect(results).toHaveLength(7);

    const expectedTemplates = [
      "vipPurchase",
      "welcome",
      "passwordReset",
      "fundingHabit",
      "riskShieldPause",
      "weeklyFridayAudit",
      "goalApprovedPayout",
    ];

    results.forEach((res, idx) => {
      expect(res.success).toBe(true);
      expect(res.to).toBe(OWNER_EMAIL);
      expect(res.template).toBe(expectedTemplates[idx]);
      expect(res.messageId).toContain(`sim_${expectedTemplates[idx]}_`);
      expect(res.bannerUrl).toMatch(/^https:\/\/journal-digital-trader\.vercel\.app\/emails\/email-.*\.png$/);
      expect(res.htmlLength).toBeGreaterThan(1500);
      expect(res.subject.length).toBeGreaterThan(15);
    });
  });

  it("2. Verifica que cada plantilla incluya el nombre personalizado y las URLs de imágenes activas", async () => {
    const welcome = await dispatchTraderEmail({
      template: "welcome",
      to: OWNER_EMAIL,
      traderName: "Edisson",
      forceSimulate: true,
    });
    expect(welcome.success).toBe(true);
    expect(welcome.subject).toContain("Edisson");
    expect(welcome.bannerUrl).toBe(
      "https://journal-digital-trader.vercel.app/emails/email-bienvenida.png"
    );
  });

  it("3. Rechaza correos con formato inválido sin romper el servidor", async () => {
    const bad = await dispatchTraderEmail({
      template: "welcome",
      to: "correo-invalido-sin-arroba",
      forceSimulate: true,
    });
    expect(bad.success).toBe(false);
    expect(bad.error).toBeDefined();
  });
});
