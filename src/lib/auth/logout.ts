import { supabase } from "@/lib/supabase/client";
import { useTradeStore } from "@/store/tradeStore";
import { useSettingsStore } from "@/store/settingsStore";

/** Claves de localStorage que contienen datos privados del usuario. */
const PRIVATE_KEY_PREFIXES = ["trading-intelligence-storage", "ai-mentor-chat-"];

/**
 * Cierra la sesión de forma real:
 *  1. Invalida la sesión en Supabase y la cookie de sesión del propietario (`/api/auth/owner-login`).
 *  2. Vacía el estado en memoria sin borrar los trades almacenados en la nube.
 *  3. Navega con recarga completa a `/login`.
 */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/owner-login", { method: "DELETE" });
  } catch { /* ignore */ }

  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("signOut falló; se limpian los datos locales de todos modos", err);
  }

  useTradeStore.setState({ trades: [], ownerId: null, syncError: null });
  useSettingsStore.getState().setOpenAiKey("");

  try {
    for (const key of Object.keys(localStorage)) {
      if (PRIVATE_KEY_PREFIXES.some(p => key.startsWith(p))) localStorage.removeItem(key);
    }
  } catch { /* localStorage bloqueado */ }

  window.location.replace("/login");
}
