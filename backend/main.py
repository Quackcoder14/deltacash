from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from routers import liquidity, simulate, agent, upload, mcp
from routers import obligations, dashboard, ml_router

app = FastAPI(title="DeltaCash API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core routers
app.include_router(liquidity.router)
app.include_router(simulate.router)
app.include_router(agent.router)
app.include_router(upload.router)
app.include_router(mcp.router)

# New routers
app.include_router(obligations.router)
app.include_router(dashboard.router)
app.include_router(ml_router.router)


@app.post("/api/stress-test")
def trigger_stress_test():
    from state_store import get_state
    from logic.engine import LiquidityEngine
    from agents.orchestrator import run_analysis
    from models.schemas import LiquidityInput

    state = get_state()
    state.stress_test = True
    liq_input = LiquidityInput(
        current_balance=state.bank_balance,
        obligations=state.obligations,
        expected_receivables=state.receivables,
        stress_test=True,
        stress_test_days=30,
    )
    engine = LiquidityEngine(liq_input)
    output = engine.run()
    agent_res = run_analysis(output, liq_input.obligations)
    return {"liquidity": output, "agentData": agent_res, "isStressTestActive": True}


@app.post("/api/stress-test/reset")
def reset_stress_test():
    from state_store import get_state
    state = get_state()
    state.stress_test = False
    return {"success": True}


@app.get("/")
def health_check():
    return {"status": "ok", "message": "DeltaCash API v2 running"}
