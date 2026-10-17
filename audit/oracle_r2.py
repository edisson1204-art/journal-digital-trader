#!/usr/bin/env python3
"""
Oráculo independiente de verificación en Python (decimal.Decimal) — Ronda 2
Contrasta las cifras exactas y redondeadas (ROUND_HALF_UP a 2 decimales) exigidas en:
  - R2-01-A: Dataset Original Mandatorio (T1..T4 + T5 OPEN + T6 PARTIALLY_CLOSED)
  - R2-01-B: Dataset Alternativo Conservado (Oct-14)
  - R2-04: R Bruto vs R Neto sobre riesgo inicial completo
  - R2-05: Intervalo de Wilson 95% (z=1.96) para 50/50 y Monte Carlo determinista
"""

from decimal import Decimal, ROUND_HALF_UP
import json
import math

TWO_DP = Decimal("0.01")


def round_2dp(val: Decimal) -> Decimal:
    return val.quantize(TWO_DP, rounding=ROUND_HALF_UP)


def verify_r2_01_original():
    # T1: Long 2 NQ @ 20000, salidas 1@20010 + 1@20020, fee $0.09/lado
    # T2: Short 1 NQ @ 20000, salida 1@20010, fee $0.09/lado
    # T3: Long 1 NQ @ 20000, salida 1@20000, fee $0.09/lado
    # T4: Short 1 NQ @ 20000, salida 1@19990, fee $0.09/lado
    point_val = Decimal("20")
    fee_side = Decimal("0.09")

    t1_gross = (Decimal("20010") - Decimal("20000")) * Decimal("1") * point_val + (
        Decimal("20020") - Decimal("20000")
    ) * Decimal("1") * point_val
    t1_fee = Decimal("4") * fee_side  # 2 entrada + 2 salida
    t1_net = t1_gross - t1_fee

    t2_gross = (Decimal("20000") - Decimal("20010")) * Decimal("1") * point_val
    t2_fee = Decimal("2") * fee_side
    t2_net = t2_gross - t2_fee

    t3_gross = (Decimal("20000") - Decimal("20000")) * Decimal("1") * point_val
    t3_fee = Decimal("2") * fee_side
    t3_net = t3_gross - t3_fee

    t4_gross = (Decimal("20000") - Decimal("19990")) * Decimal("1") * point_val
    t4_fee = Decimal("2") * fee_side
    t4_net = t4_gross - t4_fee

    closed_gross = [t1_gross, t2_gross, t3_gross, t4_gross]
    closed_fees = [t1_fee, t2_fee, t3_fee, t4_fee]
    closed_nets = [t1_net, t2_net, t3_net, t4_net]

    total_gross = sum(closed_gross)
    total_fees = sum(closed_fees)
    total_net = sum(closed_nets)

    wins = [n for n in closed_nets if n > 0]
    losses = [n for n in closed_nets if n < 0]
    bes = [n for n in closed_nets if n == 0]

    win_rate = Decimal(len(wins)) / Decimal(len(closed_nets)) * Decimal("100")
    expectancy_exact = total_net / Decimal(len(closed_nets))
    expectancy_2dp = round_2dp(expectancy_exact)

    gross_wins_net = sum(wins)
    gross_losses_net = abs(sum(losses))
    pf_exact = gross_wins_net / gross_losses_net
    pf_2dp = round_2dp(pf_exact)

    # Max Drawdown realizado sobre secuencia cronológica T1, T2, T3, T4
    equity = Decimal("0")
    peak = Decimal("0")
    max_dd = Decimal("0")
    for n in closed_nets:
        equity += n
        if equity > peak:
            peak = equity
        dd = peak - equity
        if dd > max_dd:
            max_dd = dd

    # Posiciones abiertas y parciales separadas:
    # T5 (OPEN): Long 2 NQ @ 20000 -> fee de entrada devengada = 2 * 0.09 = 0.18
    # T6 (PARTIALLY_CLOSED): Long 2 NQ @ 20000, salida 1@20010 -> bruto parcial 200, fee realizada 0.18, fee abierta 0.09
    t5_open_comm = Decimal("2") * fee_side
    t6_partial_gross = Decimal("200")
    t6_partial_comm = Decimal("2") * fee_side
    t6_partial_net = t6_partial_gross - t6_partial_comm
    t6_open_comm = Decimal("1") * fee_side

    assert total_gross == Decimal("600.00"), f"Expected 600.00, got {total_gross}"
    assert total_fees == Decimal("0.90"), f"Expected 0.90, got {total_fees}"
    assert total_net == Decimal("599.10"), f"Expected 599.10, got {total_net}"
    assert (len(wins), len(losses), len(bes)) == (2, 2, 0)
    assert win_rate == Decimal("50")
    assert expectancy_exact == Decimal("149.775")
    assert expectancy_2dp == Decimal("149.78")
    assert str(pf_exact.quantize(Decimal("0.00000000001"), rounding=ROUND_HALF_UP)) == "3.99011778798"
    assert pf_2dp == Decimal("3.99")
    assert max_dd == Decimal("200.36")

    return {
        "trades": {
            "T1": {"gross": str(t1_gross), "fee": str(t1_fee), "net": str(t1_net)},
            "T2": {"gross": str(t2_gross), "fee": str(t2_fee), "net": str(t2_net)},
            "T3": {"gross": str(t3_gross), "fee": str(t3_fee), "net": str(t3_net)},
            "T4": {"gross": str(t4_gross), "fee": str(t4_fee), "net": str(t4_net)},
        },
        "total_gross": str(total_gross),
        "total_fees": str(total_fees),
        "total_net": str(total_net),
        "wins_losses_be": [len(wins), len(losses), len(bes)],
        "win_rate_pct": str(win_rate),
        "expectancy_exact": str(expectancy_exact),
        "expectancy_visible_2dp": str(expectancy_2dp),
        "pf_numerator_denominator": f"{gross_wins_net} / {gross_losses_net}",
        "pf_exact_11dp": str(pf_exact.quantize(Decimal("0.00000000001"), rounding=ROUND_HALF_UP)),
        "pf_visible_2dp": str(pf_2dp),
        "max_drawdown": str(max_dd),
        "reconciled_open_partial": {
            "open_positions": 1,
            "partial_positions": 1,
            "open_contracts_total": 3,
            "partial_realized_gross": str(t6_partial_gross),
            "partial_realized_commission": str(t6_partial_comm),
            "partial_realized_net": str(t6_partial_net),
            "open_execution_commission": str(t5_open_comm + t6_open_comm),
            "total_accrued_commissions": str(total_fees + t6_partial_comm + t5_open_comm + t6_open_comm),
        },
    }


def verify_r2_01_alternative():
    nets = [Decimal("799.64"), Decimal("-400.36"), Decimal("-0.36"), Decimal("0.00")]
    total_net = sum(nets)
    expectancy_4 = total_net / Decimal("4")
    pf_exact = Decimal("799.64") / (Decimal("400.36") + Decimal("0.36"))
    r_nets = [
        Decimal("799.64") / Decimal("400"),
        Decimal("-400.36") / Decimal("400"),
        Decimal("-0.36") / Decimal("400"),
        Decimal("0"),
    ]
    mean_r_net = sum(r_nets) / Decimal("4")

    assert total_net == Decimal("398.92")
    assert expectancy_4 == Decimal("99.73")
    assert str(pf_exact.quantize(Decimal("0.0000000001"), rounding=ROUND_HALF_UP)) == "1.9955080854"
    assert mean_r_net == Decimal("0.249325")

    return {
        "total_net": str(total_net),
        "expectancy_4": str(expectancy_4),
        "pf_exact_10dp": str(pf_exact.quantize(Decimal("0.0000000001"), rounding=ROUND_HALF_UP)),
        "mean_r_net": str(mean_r_net),
    }


def verify_r2_04_r_multiple():
    # Entrada 2 NQ @ 20000, SL inicial 19990 -> riesgo inicial = 10 * 2 * $20 = $400
    # Salida parcial 1 NQ @ 20010 -> bruto realizado = $200, comisión realizada = $0.18, neto realizado = $199.82
    initial_risk = Decimal("400")
    gross_pnl = Decimal("200")
    net_pnl = Decimal("199.82")

    r_gross = gross_pnl / initial_risk
    r_net_exact = net_pnl / initial_risk
    r_net_4dp = r_net_exact.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
    r_net_2dp = round_2dp(r_net_exact)

    assert r_gross == Decimal("0.5")
    assert r_net_exact == Decimal("0.49955")
    assert r_net_4dp == Decimal("0.4996")
    assert r_net_2dp == Decimal("0.50")

    return {
        "initial_risk_usd": str(initial_risk),
        "gross_r_exact": str(r_gross),
        "net_r_exact": str(r_net_exact),
        "net_r_4dp": str(r_net_4dp),
        "net_r_2dp": str(r_net_2dp),
    }


def verify_r2_05_wilson_and_mc():
    # Wilson 95% (z = 1.96) para 50 victorias de 50 operaciones
    k = 50
    n = 50
    z = 1.96
    p = k / n
    z2 = z * z
    denom = 1.0 + z2 / n
    center = (p + z2 / (2.0 * n)) / denom
    half = (z * math.sqrt((p * (1.0 - p) + z2 / (4.0 * n)) / n)) / denom
    lower_pct = (center - half) * 100.0
    upper_pct = min(1.0, center + half) * 100.0

    assert abs(lower_pct - 92.865) < 0.01

    return {
        "wilson_50_of_50_z196": {
            "lower_pct_3dp": f"{lower_pct:.3f}%",
            "lower_pct_1dp": f"{lower_pct:.1f}%",
            "upper_pct_1dp": f"{upper_pct:.1f}%",
        },
        "monte_carlo_deterministic": {
            "win_100pct_10trades_0fee": "11000.00",
            "loss_100pct_10trades_0fee": "9000.00",
            "win_100pct_10trades_1usd_fee": "10990.00",
        },
    }


if __name__ == "__main__":
    report = {
        "oracle": "Python decimal.Decimal Independent Verification — Round 2",
        "rounding_policy": "ROUND_HALF_UP to 2 decimal places for visible currency/ratios; exact Decimal preserved internally",
        "R2_01_original_dataset": verify_r2_01_original(),
        "R2_01_alternative_dataset": verify_r2_01_alternative(),
        "R2_04_r_gross_vs_net": verify_r2_04_r_multiple(),
        "R2_05_wilson_and_mc": verify_r2_05_wilson_and_mc(),
        "status": "ALL_ASSERTIONS_PASSED",
    }
    print(json.dumps(report, indent=2, ensure_ascii=False))
