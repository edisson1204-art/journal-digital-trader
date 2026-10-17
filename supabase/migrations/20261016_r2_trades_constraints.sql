-- Migration: 20261016_r2_trades_constraints
-- Purpose: Prevent over-closed trades (contractsExited > totalContracts) and invalid contract counts at the database level (R2-02)

BEGIN;

ALTER TABLE public.trades
  DROP CONSTRAINT IF EXISTS trades_valid_contracts_check;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_valid_contracts_check
  CHECK (
    jsonb_typeof(data) = 'object'
    AND ((data->>'totalContracts')::numeric > 0)
    AND (COALESCE((data->>'contractsExited')::numeric, 0) >= 0)
    AND (COALESCE((data->>'contractsExited')::numeric, 0) <= (data->>'totalContracts')::numeric)
  ) NOT VALID;

ALTER TABLE public.trades
  VALIDATE CONSTRAINT trades_valid_contracts_check;

COMMIT;
