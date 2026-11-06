import { NextResponse } from "next/server";
import { timingSafeEqual, createHmac } from "node:crypto";

const OWNER_EMAIL = "edisson1204@gmail.com";
const OWNER_PASS = process.env.OWNER_MASTER_PASSWORD || "2704Verd*";
const COOKIE_NAME = "tdi_owner_session";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function computeOwnerSessionToken(): string {
  const secret = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "tdi-owner-fallback-key";
  return createHmac("sha256", secret).update(`${OWNER_EMAIL}:${OWNER_PASS}`).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!safeEqual(email, OWNER_EMAIL) || !safeEqual(password, OWNER_PASS)) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const token = computeOwnerSessionToken();
    const res = NextResponse.json({
      authenticated: true,
      email: OWNER_EMAIL,
      role: "owner",
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 días de acceso continuo
    });

    return res;
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ loggedOut: true });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
