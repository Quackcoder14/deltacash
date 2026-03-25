"""
DeltaCash – Obligations Router  
Endpoints for listing, adding, updating obligations.
"""
import uuid
from datetime import date
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from state_store import get_state
from logic.engine import LiquidityEngine
from models.schemas import LiquidityInput, Obligation, RelationshipType, ObligationStatus

router = APIRouter(prefix="/api/obligations", tags=["Obligations"])


class AddObligationRequest(BaseModel):
    vendor: str
    amount: float
    due_date: date
    relationship: str = "Important"
    penalty_rate: float = 0.02
    urgency: int = 5
    category: str = "General"
    notes: Optional[str] = None
    interest_rate: Optional[float] = None


@router.get("/")
def list_obligations():
    state = get_state()
    return {"obligations": state.obligations}


@router.post("/")
def add_obligation(req: AddObligationRequest):
    state = get_state()
    rel_map = {"Critical": RelationshipType.CRITICAL, "Important": RelationshipType.IMPORTANT, "Flexible": RelationshipType.FLEXIBLE}
    obl = Obligation(
        id=f"obl_{uuid.uuid4().hex[:8]}",
        vendor=req.vendor,
        amount=req.amount,
        due_date=req.due_date,
        relationship=rel_map.get(req.relationship, RelationshipType.IMPORTANT),
        penalty_rate=req.penalty_rate,
        urgency=req.urgency,
        category=req.category,
        notes=req.notes,
    )
    state.add_obligation(obl)
    # Return updated liquidity
    liq_input = LiquidityInput(
        current_balance=state.bank_balance,
        obligations=state.obligations,
        expected_receivables=state.receivables,
    )
    engine = LiquidityEngine(liq_input)
    return {"obligation": obl, "updated_liquidity": engine.run()}


@router.delete("/{obligation_id}")
def mark_paid(obligation_id: str):
    state = get_state()
    for i, ob in enumerate(state.obligations):
        if ob.id == obligation_id:
            state.obligations[i] = ob.model_copy(update={"status": ObligationStatus.PAID})
            return {"success": True}
    raise HTTPException(status_code=404, detail="Obligation not found")
