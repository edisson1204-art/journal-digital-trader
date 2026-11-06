import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { computeOwnerSessionToken } from "@/app/api/auth/owner-login/route";

/**
 * Protección de /app/* en el servidor.
 * - Permite acceso inmediato si existe la sesión maestra firmada del propietario (`tdi_owner_session`)
 *   o una sesión válida de Supabase Auth (`supabase.auth.getUser()`).
 * - Si Supabase está temporalmente despertando (COMING_UP), no bloquea al propietario ni lanza error 500.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // 1) Verificar cookie firmada del propietario (acceso instantáneo y resiliente)
  const ownerCookie = request.cookies.get("tdi_owner_session")?.value;
  if (ownerCookie && ownerCookie === computeOwnerSessionToken()) {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  // 2) Verificar sesión estándar de Supabase Auth
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      },
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  } catch {
    // Si Supabase está despertando y no había cookie de propietario, redirigir a /login
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const redirect = NextResponse.redirect(url);
  redirect.headers.set("Cache-Control", "no-store");
  return redirect;
}

export const config = {
  matcher: ["/app/:path*"],
};
