import json
from datetime import date, timedelta
from typing import List

from models.schemas import LiquidityInput, Obligation, Receivable, RelationshipType

def _get_mock_obligations() -> List[Obligation]:
    today = date.today()
    return [
        Obligation(
            id="obl_001", vendor="Acme Corp", amount=45000, 
            due_date=today + timedelta(days=2), 
            relationship=RelationshipType.CRITICAL, penalty_rate=0.03, urgency=9
        ),
        Obligation(
            id="obl_002", vendor="Global Tech", amount=12000, 
            due_date=today + timedelta(days=5), 
            relationship=RelationshipType.IMPORTANT, penalty_rate=0.02, urgency=6
        ),
        Obligation(
            id="obl_003", vendor="XYZ Distributors", amount=85000, 
            due_date=today + timedelta(days=8), 
            relationship=RelationshipType.FLEXIBLE, penalty_rate=0.01, urgency=4
        ),
        Obligation(
            id="obl_004", vendor="Prime Supplies", amount=32000, 
            due_date=today + timedelta(days=12), 
            relationship=RelationshipType.IMPORTANT, penalty_rate=0.015, urgency=5
        ),
        Obligation(
            id="obl_005", vendor="City Logistics", amount=15000, 
            due_date=today + timedelta(days=15), 
            relationship=RelationshipType.FLEXIBLE, penalty_rate=0.01, urgency=3
        ),
        Obligation(
            id="obl_006", vendor="Alliance Properties", amount=50000, 
            due_date=today + timedelta(days=1), 
            relationship=RelationshipType.CRITICAL, penalty_rate=0.05, urgency=10
        ),
    ]

def _get_mock_receivables() -> List[Receivable]:
    today = date.today()
    return [
        Receivable(
            id="rec_001", payer="TechFlow SME", amount=95000, 
            expected_date=today + timedelta(days=3), confidence=0.8
        ),
        Receivable(
            id="rec_002", payer="Innovate Solutions", amount=45000, 
            expected_date=today + timedelta(days=6), confidence=0.6
        ),
        Receivable(
            id="rec_003", payer="NextGen Retail", amount=120000, 
            expected_date=today + timedelta(days=10), confidence=0.9
        ),
        Receivable(
            id="rec_004", payer="Market Builders", amount=30000, 
            expected_date=today + timedelta(days=14), confidence=0.5
        ),
    ]

# Dependency to get starting state
def get_seeded_liquidity_input(stress_test: bool = False) -> LiquidityInput:
    return LiquidityInput(
        current_balance=250000.00,  # Starting ₹2.5L
        obligations=_get_mock_obligations(),
        expected_receivables=_get_mock_receivables(),
        stress_test=stress_test,
        stress_test_days=30
    )
