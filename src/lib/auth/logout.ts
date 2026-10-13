import { supabase } from "@/lib/supabase/client";
import { useTradeStore } from "@/store/tradeStore";
import { useSettingsStore } from "@/store/settingsStore";

/** Claves de localStorage que contienen datos privados del usuario. */
const PRIVATE_KEY_PREFIXES = ["trading-intelligence-storage", "ai-mentor-chat-"];

/**
 * Cierra la sesión de forma real:
 *  1. Invalida la sesión en Supabase (revoca el refresh token). Nota: el access token (JWT) ya emitido
 *     sigue siendo técnicamente válido hasta su expiración (por defecto 1 h); la ventana no se puede
 *     acortar desde el cliente.
 *  2. Vacía los stores en memoria y los datos privados persistidos (trades, chats, clave OpenAI).
 *  3. Navega con recarga completa para destruir cualquier estado en memoria.
 */
export async function logout(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("signOut falló; se limpian los datos locales de todos modos", err);
  }

  useTradeStore.setState({ trades: [], ownerId: null, syncError: null });
  useTradeStore.getState().clearTrades();
  useSettingsStore.getState().setOpenAiKey("");

  try {
    for (const key of Object.keys(localStorage)) {
      if (PRIVATE_KEY_PREFIXES.some(p => key.startsWith(p))) localStorage.removeItem(key);
    }
  } catch { /* localStorage bloqueado */ }

  window.location.replace("/login");
}
