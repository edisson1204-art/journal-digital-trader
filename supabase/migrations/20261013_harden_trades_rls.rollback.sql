-- Rollback de 20261013_harden_trades_rls.sql: restaura el estado auditado antes del cambio.
drop policy if exists "trades_select_own" on public.trades;
drop policy if exists "trades_insert_own" on public.trades;
drop policy if exists "trades_update_own" on public.trades;
drop policy if exists "trades_delete_own" on public.trades;

create policy "Traders pueden ver sus propios trades" on public.trades for select to public using (auth.uid() = user_id);
create policy "Traders pueden agregar sus propios trades" on public.trades for insert to public with check (auth.uid() = user_id);
create policy "Traders pueden modificar sus propios trades" on public.trades for update to public using (auth.uid() = user_id);
create policy "Traders pueden borrar sus propios trades" on public.trades for delete to public using (auth.uid() = user_id);

drop index if exists public.trades_user_id_idx;
alter table public.trades alter column user_id drop not null;

grant all on table public.trades to anon;
grant truncate, trigger, references on table public.trades to authenticated;
