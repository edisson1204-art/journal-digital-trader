-- Rollback: 20261016_r2_trades_constraints
-- Purpose: Revert trades_valid_contracts_check constraint on public.trades

BEGIN;

ALTER TABLE public.trades
  DROP CONSTRAINT IF EXISTS trades_valid_contracts_check;

COMMIT;
