"""
DeltaCash – LiquidityEngine
Deterministic math engine: True Liquidity, DTZ, and delay simulation.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple

from models.schemas import (
    DailyProjection,
    LiquidityInput,
    LiquidityOutput,
    Obligation,
    Receivable,
    SimulateDelayRequest,
    SimulateDelayResponse,
)


class LiquidityEngine:
    """
    Core deterministic engine. All financial calculations live here.
    LLM / AI is NOT used anywhere in this class.
    """

    TAX_RESERVE_RATE = 0.20  # 20% of receivables reserved for tax

    def __init__(self, input_data: LiquidityInput):
        self.balance = input_data.current_balance
        self.obligations: List[Obligation] = input_data.obligations
        self.receivables: List[Receivable] = input_data.expected_receivables
        self.stress_test = input_data.stress_test
        self.stress_test_days = input_data.stress_test_days
        self.today = date.today()

        # In stress-test mode, mark all receivables as delayed by stress_test_days
        if self.stress_test:
            self.receivables = [
                r.model_copy(
                    update={
                        "expected_date": r.expected_date + timedelta(days=self.stress_test_days),
                        "confidence": 0.1,
                    }
                )
                for r in self.receivables
            ]

    # ─── Public API ──────────────────────────────────────────────────────

    def run(self) -> LiquidityOutput:
        obligations_due_7d = self._obligations_due_within(7)
        tax_reserve = self._tax_reserve()
        true_liquidity = self._calculate_true_liquidity(obligations_due_7d, tax_reserve)
        projections = self._build_projections(30)
        # Extend horizon to find actual DTZ (up to 365 days)
        dtz_date, dtz_days = self._calculate_dtz_extended()
        warning_level = self._warning_level(dtz_days)

        return LiquidityOutput(
            true_liquidity=round(true_liquidity, 2),
            dtz_date=dtz_date,
            dtz_days=dtz_days,
            daily_projections=projections,
            obligations=self.obligations,
            tax_reserve=round(tax_reserve, 2),
            obligations_due_7d=round(obligations_due_7d, 2),
            warning_level=warning_level,
            stress_test_active=self.stress_test,
        )

    def simulate_delay(self, obligation_id: str, days: int) -> Tuple[List[DailyProjection], Optional[date], Optional[int]]:
        """Return projections with the given obligation shifted by `days`."""
        modified_obligations = []
        for ob in self.obligations:
            if ob.id == obligation_id:
                modified_obligations.append(
                    ob.model_copy(update={"due_date": ob.due_date + timedelta(days=days)})
                )
            else:
                modified_obligations.append(ob)

        orig_obligations = self.obligations
        self.obligations = modified_obligations
        projections = self._build_projections(30)
        dtz_date, dtz_days = self._calculate_dtz(projections)
        self.obligations = orig_obligations
        return projections, dtz_date, dtz_days

    # ─── Core Math ───────────────────────────────────────────────────────

    def _obligations_due_within(self, days: int) -> float:
        """Sum of all pending obligations due within `days` days from today."""
        cutoff = self.today + timedelta(days=days)
        return sum(
            ob.amount
            for ob in self.obligations
            if ob.due_date <= cutoff and ob.status == "pending"
        )

    def _tax_reserve(self) -> float:
        """20% of total expected receivables reserved for tax."""
        return self.TAX_RESERVE_RATE * sum(r.amount for r in self.receivables)

    def _calculate_true_liquidity(self, obligations_due_7d: float, tax_reserve: float) -> float:
        """
        True Liquidity = Balance - Obligations_due_7d - Tax_Reserve
        """
        return self.balance - obligations_due_7d - tax_reserve

    def _build_projections(self, horizon_days: int) -> List[DailyProjection]:
        """Build a day-by-day cash flow projection for `horizon_days` days."""
        projections: List[DailyProjection] = []
        cumulative_inflow = 0.0
        cumulative_outflow = 0.0
        running_balance = self.balance

        for day_offset in range(horizon_days):
            current_date = self.today + timedelta(days=day_offset)

            # Outflows: obligations due on this date
            day_outflow = sum(
                ob.amount
                for ob in self.obligations
                if ob.due_date == current_date and ob.status == "pending"
            )

            # Inflows: receivables expected on this date (weighted by confidence)
            day_inflow = sum(
                r.amount * r.confidence
                for r in self.receivables
                if r.expected_date == current_date
            )

            cumulative_inflow += day_inflow
            cumulative_outflow += day_outflow
            running_balance = running_balance + day_inflow - day_outflow

            # committed = locked outflows up to today
            committed = running_balance - day_inflow  # simplification: available before today's inflow
            projections.append(
                DailyProjection(
                    date=current_date,
                    committed=round(day_outflow, 2),
                    available=round(max(running_balance, 0), 2),
                    cumulative_inflow=round(cumulative_inflow, 2),
                    cumulative_outflow=round(cumulative_outflow, 2),
                )
            )

        return projections

    def _calculate_dtz(
        self, projections: List[DailyProjection]
    ) -> Tuple[Optional[date], Optional[int]]:
        """
        Days to Zero (DTZ): first day when running available balance goes negative.
        Returns (date, days_from_today) or (None, None) if cash is never exhausted.
        """
        for i, proj in enumerate(projections):
            if proj.available <= 0:
                return proj.date, i
        return None, None

    def _calculate_dtz_extended(self) -> Tuple[Optional[date], int]:
        """
        Extended DTZ calculation up to 365 days.
        If cash never reaches zero in 365 days, returns (None, 365+).
        Always returns an int (never None) so the frontend never shows ∞.
        """
        projections = self._build_projections(365)
        for i, proj in enumerate(projections):
            if proj.available <= 0:
                return proj.date, i
        # Cash never hits zero: return last projection day count as a safe estimate
        last_balance = projections[-1].available if projections else self.balance
        # Estimate extra days beyond 365 based on burn rate
        total_outflow = sum(
            ob.amount for ob in self.obligations if ob.status == "pending"
        )
        if total_outflow == 0:
            return None, 999  # effectively infinite → show 999+
        # Simple burn rate: daily spend
        daily_burn = total_outflow / max(len(projections), 1)
        if daily_burn <= 0:
            return None, 999
        extra_days = int(last_balance / daily_burn)
        return None, min(999, 365 + extra_days)

    def _warning_level(self, dtz_days: Optional[int]) -> str:
        if dtz_days is None or dtz_days > 90:
            return "green"
        if dtz_days > 30:
            return "green"
        if dtz_days > 15:
            return "yellow"
        return "red"


# ─── Module-level helper used by the router ──────────────────────────────────

def build_simulate_response(
    request: SimulateDelayRequest,
    engine: LiquidityEngine,
) -> SimulateDelayResponse:
    """
    Wrapper that runs a simulate_delay and returns a typed response.
    """
    orig_result = engine.run()
    original_dtz_days = orig_result.dtz_days

    _, new_dtz_date, new_dtz_days = engine.simulate_delay(request.obligation_id, request.days)

    # Find the obligation
    target_ob = next((o for o in engine.obligations if o.id == request.obligation_id), None)
    if target_ob is None:
        raise ValueError(f"Obligation {request.obligation_id} not found")

    # Build updated output with shifted obligation
    modified_obs = [
        o.model_copy(update={"due_date": o.due_date + timedelta(days=request.days)})
        if o.id == request.obligation_id else o
        for o in engine.obligations
    ]
    updated_input = LiquidityInput(
        current_balance=engine.balance,
        obligations=modified_obs,
        expected_receivables=engine.receivables,
    )
    updated_engine = LiquidityEngine(updated_input)
    updated_output = updated_engine.run()

    if new_dtz_days is None or (original_dtz_days is not None and new_dtz_days > original_dtz_days):
        impact = "improved"
    elif original_dtz_days == new_dtz_days:
        impact = "unchanged"
    else:
        impact = "worsened"

    return SimulateDelayResponse(
        obligation_id=request.obligation_id,
        original_due_date=target_ob.due_date,
        new_due_date=target_ob.due_date + timedelta(days=request.days),
        original_dtz_days=original_dtz_days,
        new_dtz_days=new_dtz_days,
        delta_days=(new_dtz_days or 0) - (original_dtz_days or 0),
        impact=impact,
        updated_liquidity=updated_output,
    )
