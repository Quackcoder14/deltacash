import pytest
from datetime import date, timedelta
from models.schemas import LiquidityInput, Obligation, Receivable, RelationshipType
from logic.engine import LiquidityEngine

@pytest.fixture
def base_input():
    today = date.today()
    return LiquidityInput(
        current_balance=100000.0,
        obligations=[
            Obligation(
                id="obl_1", vendor="A", amount=20000, 
                due_date=today + timedelta(days=2), 
                relationship=RelationshipType.IMPORTANT
            ),
            Obligation(
                id="obl_2", vendor="B", amount=30000, 
                due_date=today + timedelta(days=8), 
                relationship=RelationshipType.IMPORTANT
            ),
        ],
        expected_receivables=[
            Receivable(
                id="rec_1", payer="C", amount=50000, 
                expected_date=today + timedelta(days=5), confidence=1.0
            )
        ]
    )

def test_true_liquidity_calculation(base_input):
    engine = LiquidityEngine(base_input)
    # obligations due in 7 days = obl_1 (20,000)
    # tax reserve = 20% of 50,000 = 10,000
    # true liquidity = 100,000 - 20,000 - 10,000 = 70,000
    output = engine.run()
    
    assert output.obligations_due_7d == 20000.0
    assert output.tax_reserve == 10000.0
    assert output.true_liquidity == 70000.0

def test_dtz_calculation_positive(base_input):
    base_input.current_balance = 15000.0
    # Start: 15,000
    # Day 2: Outflow 20,000 -> Balance = -5,000 (DTZ hit on Day 2!)
    engine = LiquidityEngine(base_input)
    output = engine.run()
    
    assert output.dtz_days == 2
    assert output.warning_level == "red"

def test_simulate_delay(base_input):
    base_input.current_balance = 15000.0
    engine = LiquidityEngine(base_input)
    
    # Delay obl_1 by 5 days -> new due date Day 7
    # Start: 15k
    # Day 5: Inflow 50k -> Balance = 65k
    # Day 7: Outflow 20k -> Balance = 45k
    # Day 8: Outflow 30k -> Balance = 15k
    # Never goes negative -> DTZ should become None!
    
    projections, dtz_date, dtz_days = engine.simulate_delay("obl_1", 5)
    
    assert dtz_days is None
