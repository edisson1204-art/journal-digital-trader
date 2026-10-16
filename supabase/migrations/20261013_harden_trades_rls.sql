-- 20261013_harden_trades_rls.sql
-- Endurece public.trades. Estado previo auditado el 2026-10-13: RLS activo con 4 políticas auth.uid() = user_id,
-- pero anon/authenticated con TRUNCATE/TRIGGER/REFERENCES (TRUNCATE ignora RLS), user_id nullable, sin índice por user_id.
-- La tabla tenía 0 filas al aplicar, por lo que no hay riesgo de pérdida de datos.
-- Rollback: 20261013_harden_trades_rls.rollback.sql

-- 1) Privilegios mínimos: la app exige sesión, así que anon no necesita nada sobre trades.
revoke all on table public.trades from anon;
revoke truncate, trigger, references on table public.trades from authenticated;

-- 2) Todo trade debe tener dueño.
alter table public.trades alter column user_id set not null;

-- 3) Índice para las consultas por dueño (select ... where user_id = ...).
create index if not exists trades_user_id_idx on public.trades (user_id);

-- 4) Políticas solo para usuarios autenticados, con WITH CHECK explícito en UPDATE
--    (un usuario no puede reasignar un trade a otro user_id).
drop policy if exists "Traders pueden ver sus propios trades" on public.trades;
drop policy if exists "Traders pueden agregar sus propios trades" on public.trades;
drop policy if exists "Traders pueden modificar sus propios trades" on public.trades;
drop policy if exists "Traders pueden borrar sus propios trades" on public.trades;

create policy "trades_select_own" on public.trades for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "trades_insert_own" on public.trades for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "trades_update_own" on public.trades for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "trades_delete_own" on public.trades for delete to authenticated
  using ((select auth.uid()) = user_id);
