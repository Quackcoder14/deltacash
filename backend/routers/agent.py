from fastapi import APIRouter
from logic.engine import LiquidityEngine
from agents.orchestrator import run_analysis
from dependencies import get_seeded_liquidity_input

router = APIRouter(prefix="/api/agent", tags=["Agents"])

@router.get("/analyze")
def trigger_agent_analysis():
    """Run LangGraph analysis on current state."""
    liq_input = get_seeded_liquidity_input()
    engine = LiquidityEngine(liq_input)
    output = engine.run()
    
    return run_analysis(output, liq_input.obligations)
