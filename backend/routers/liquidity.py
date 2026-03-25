from fastapi import APIRouter
from state_store import get_state
from logic.engine import LiquidityEngine
from models.schemas import LiquidityInput

router = APIRouter(prefix="/api/liquidity", tags=["Liquidity"])

@router.get("/")
def get_liquidity():
    """Get the current liquidity dashboard data."""
    state = get_state()
    liq_input = LiquidityInput(
        current_balance=state.bank_balance,
        obligations=state.obligations,
        expected_receivables=state.receivables,
        stress_test=state.stress_test,
        stress_test_days=state.stress_test_days,
    )
    engine = LiquidityEngine(liq_input)
    return engine.run()
