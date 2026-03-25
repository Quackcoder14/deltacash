from fastapi import APIRouter
from state_store import get_state
from logic.engine import LiquidityEngine, build_simulate_response
from models.schemas import SimulateDelayRequest, LiquidityInput

router = APIRouter(prefix="/api/simulate", tags=["Simulate"])

@router.post("/")
def simulate_delay(request: SimulateDelayRequest):
    """Simulate delaying an obligation by X days against current state."""
    state = get_state()
    liq_input = LiquidityInput(
        current_balance=state.bank_balance,
        obligations=state.obligations,
        expected_receivables=state.receivables,
    )
    engine = LiquidityEngine(liq_input)
    return build_simulate_response(request, engine)

@router.post("/commit")
def commit_delay(request: SimulateDelayRequest):
    """Actually defer an obligation in the global state."""
    state = get_state()
    state.defer_obligation(request.obligation_id, request.days)
    # Return updated liquidity
    liq_input = LiquidityInput(
        current_balance=state.bank_balance,
        obligations=state.obligations,
        expected_receivables=state.receivables,
    )
    from logic.engine import LiquidityEngine
    engine = LiquidityEngine(liq_input)
    return {"updated_liquidity": engine.run(), "success": True}
