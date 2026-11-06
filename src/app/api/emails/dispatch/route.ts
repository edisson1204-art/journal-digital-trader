import { NextResponse } from "next/server";
import {
  dispatchTraderEmail,
  dispatchAllSevenEmailsSimulation,
  type EmailTemplateType,
} from "@/lib/emailDispatcher";

const VALID_TEMPLATES: EmailTemplateType[] = [
  "vipPurchase",
  "welcome",
  "passwordReset",
  "fundingHabit",
  "riskShieldPause",
  "weeklyFridayAudit",
  "goalApprovedPayout",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const to = String(body?.to || "").trim().toLowerCase();
    const traderName = String(body?.traderName || "Trader").trim();
    const sendAllSuite = Boolean(body?.sendAllSuite);

    if (sendAllSuite) {
      const results = await dispatchAllSevenEmailsSimulation(to, traderName);
      const allOk = results.every((r) => r.success);
      return NextResponse.json(
        {
          success: allOk,
          totalSent: results.length,
          recipient: to,
          results,
        },
        { status: allOk ? 200 : 400 }
      );
    }

    const template = body?.template as EmailTemplateType;
    if (!VALID_TEMPLATES.includes(template)) {
      return NextResponse.json(
        { error: "Plantilla de correo no válida." },
        { status: 400 }
      );
    }

    const result = await dispatchTraderEmail({
      template,
      to,
      traderName,
      actionUrl: body?.actionUrl,
      forceSimulate: Boolean(body?.forceSimulate),
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch {
    return NextResponse.json(
      { error: "Error procesando el envío del correo." },
      { status: 500 }
    );
  }
}
