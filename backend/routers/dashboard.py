"""
DeltaCash – Dashboard Router
CIBIL, cash breakdown, transactions, and summary endpoints.
"""
from fastapi import APIRouter
from state_store import get_state

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/cibil")
def get_cibil():
    state = get_state()
    score = state.cibil_score
    # Determine rating
    if score >= 750:
        rating = "Excellent"
        color = "green"
    elif score >= 700:
        rating = "Good"
        color = "blue"
    elif score >= 650:
        rating = "Fair"
        color = "yellow"
    else:
        rating = "Poor"
        color = "red"
    return {
        "score": score,
        "rating": rating,
        "color": color,
        "history": state.cibil_history,
        "factors": {
            "payment_history": 85,
            "credit_utilization": 62,
            "credit_age": 70,
            "credit_mix": 80,
            "new_credit": 90,
        }
    }


@router.get("/cash-breakdown")
def get_cash_breakdown():
    state = get_state()
    return state.get_cash_breakdown()


@router.get("/transactions")
def get_transactions(limit: int = 100):
    state = get_state()
    txns = sorted(state.transactions, key=lambda t: t.date, reverse=True)
    return {"transactions": txns[:limit]}


@router.get("/summary")
def get_summary():
    """Overview stats for the dashboard KPI cards."""
    state = get_state()
    from datetime import date, timedelta
    today = date.today()
    
    pending_total = sum(ob.amount for ob in state.obligations if ob.status == "pending")
    overdue = [ob for ob in state.obligations if ob.due_date < today and ob.status == "pending"]
    overdue_total = sum(ob.amount for ob in overdue)
    
    # Monthly spend (last 30 days)
    past_30 = today - timedelta(days=30)
    monthly_spend = abs(sum(t.amount for t in state.transactions if t.date >= past_30 and t.amount < 0))
    monthly_income = sum(t.amount for t in state.transactions if t.date >= past_30 and t.amount > 0)
    
    # Category breakdown (last 90 days)
    past_90 = today - timedelta(days=90)
    cat_spend: dict = {}
    for t in state.transactions:
        if t.date >= past_90 and t.amount < 0:
            cat_spend[t.category] = cat_spend.get(t.category, 0) + abs(t.amount)
    
    cb = state.get_cash_breakdown()
    
    return {
        "bank_balance": state.bank_balance,
        "pending_obligations": len([o for o in state.obligations if o.status == "pending"]),
        "pending_total": pending_total,
        "overdue_count": len(overdue),
        "overdue_total": overdue_total,
        "monthly_spend": monthly_spend,
        "monthly_income": monthly_income,
        "cash_breakdown": cb,
        "category_spend": cat_spend,
    }
