"""
DeltaCash – In-Memory State Store
Maintains mutable application state across requests (simulation-safe).
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from models.schemas import (
    Obligation, Receivable, Transaction,
    RelationshipType, ObligationStatus
)

# ---------------------------------------------------------------------------
# Seed obligations & receivables
# ---------------------------------------------------------------------------

def _seed_obligations() -> List[Obligation]:
    today = date.today()
    return [
        Obligation(
            id="obl_001", vendor="Acme Corp", amount=45000,
            due_date=today + timedelta(days=2),
            relationship=RelationshipType.CRITICAL, penalty_rate=0.03, urgency=9,
            category="Raw Materials"
        ),
        Obligation(
            id="obl_002", vendor="Global Tech", amount=12000,
            due_date=today + timedelta(days=5),
            relationship=RelationshipType.IMPORTANT, penalty_rate=0.02, urgency=6,
            category="IT & Software"
        ),
        Obligation(
            id="obl_003", vendor="XYZ Distributors", amount=85000,
            due_date=today + timedelta(days=8),
            relationship=RelationshipType.FLEXIBLE, penalty_rate=0.01, urgency=4,
            category="Logistics"
        ),
        Obligation(
            id="obl_004", vendor="Prime Supplies", amount=32000,
            due_date=today + timedelta(days=12),
            relationship=RelationshipType.IMPORTANT, penalty_rate=0.015, urgency=5,
            category="Operations"
        ),
        Obligation(
            id="obl_005", vendor="City Logistics", amount=15000,
            due_date=today + timedelta(days=15),
            relationship=RelationshipType.FLEXIBLE, penalty_rate=0.01, urgency=3,
            category="Logistics"
        ),
        Obligation(
            id="obl_006", vendor="Alliance Properties", amount=50000,
            due_date=today + timedelta(days=1),
            relationship=RelationshipType.CRITICAL, penalty_rate=0.05, urgency=10,
            category="Rent & Lease"
        ),
    ]


def _seed_receivables() -> List[Receivable]:
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


def _seed_transactions() -> List[Transaction]:
    """Seed historical transactions (past 6 months)."""
    today = date.today()
    txns = []
    # Past credits
    credits = [
        ("TechFlow SME", 95000, 30), ("NextGen Retail", 120000, 55),
        ("Innovate Solutions", 45000, 60), ("Market Builders", 30000, 75),
        ("TechFlow SME", 88000, 90), ("NextGen Retail", 115000, 110),
        ("Innovate Solutions", 50000, 120), ("SkyBridge Corp", 200000, 140),
        ("NextGen Retail", 130000, 160), ("TechFlow SME", 92000, 180),
    ]
    for i, (payer, amt, days_ago) in enumerate(credits):
        txns.append(Transaction(
            id=f"txn_cr_{i:03d}",
            date=today - timedelta(days=days_ago),
            amount=amt,
            description=f"Payment received from {payer}",
            vendor=payer,
            category="Income",
            source="bank"
        ))
    # Past debits
    debits = [
        ("Acme Corp", 45000, 32), ("Alliance Properties", 50000, 31),
        ("Global Tech", 12000, 35), ("XYZ Distributors", 85000, 38),
        ("Prime Supplies", 32000, 42), ("City Logistics", 15000, 45),
        ("Acme Corp", 43000, 62), ("Alliance Properties", 50000, 61),
        ("Global Tech", 11000, 65), ("XYZ Distributors", 80000, 68),
        ("Prime Supplies", 30000, 72), ("City Logistics", 14000, 75),
        ("Acme Corp", 44000, 92), ("Alliance Properties", 50000, 91),
        ("Global Tech", 12500, 95), ("XYZ Distributors", 82000, 99),
        ("Prime Supplies", 31000, 102), ("City Logistics", 15500, 106),
        ("Salary", 180000, 30), ("Salary", 180000, 60), ("Salary", 180000, 90),
        ("Office Utilities", 8000, 30), ("Office Utilities", 7500, 60), ("Office Utilities", 8200, 90),
    ]
    for i, (vendor, amt, days_ago) in enumerate(debits):
        txns.append(Transaction(
            id=f"txn_db_{i:03d}",
            date=today - timedelta(days=days_ago),
            amount=-amt,
            description=f"Payment to {vendor}",
            vendor=vendor,
            category="Salaries" if vendor == "Salary" else "Utilities" if vendor == "Office Utilities" else "Vendor Payment",
            source="bank"
        ))
    return sorted(txns, key=lambda t: t.date)


# ---------------------------------------------------------------------------
# Global State
# ---------------------------------------------------------------------------

class AppState:
    def __init__(self):
        self.reset()

    def reset(self):
        self.bank_balance: float = 250000.0
        self.obligations: List[Obligation] = _seed_obligations()
        self.receivables: List[Receivable] = _seed_receivables()
        self.transactions: List[Transaction] = _seed_transactions()
        self.stress_test: bool = False
        self.stress_test_days: int = 30
        self.cibil_score: int = 742  # mock CIBIL score
        self.cibil_history: List[Dict] = self._cibil_history()

    def _cibil_history(self):
        today = date.today()
        scores = [710, 718, 725, 730, 736, 742]
        return [
            {"month": (today.replace(day=1) - timedelta(days=30*i)).strftime("%b %Y"), "score": scores[5-i]}
            for i in range(6)
        ]

    def add_obligation(self, obl: Obligation):
        self.obligations.append(obl)
        # Also add as a future transaction
        self.transactions.append(Transaction(
            id=f"txn_{obl.id}",
            date=obl.due_date,
            amount=-obl.amount,
            description=f"Pending payment to {obl.vendor}",
            vendor=obl.vendor,
            category=obl.category,
            source="manual"
        ))

    def defer_obligation(self, obligation_id: str, days: int):
        for i, ob in enumerate(self.obligations):
            if ob.id == obligation_id:
                self.obligations[i] = ob.model_copy(
                    update={"due_date": ob.due_date + timedelta(days=days),
                            "deferred_days": ob.deferred_days + days}
                )
                break

    def get_cash_breakdown(self):
        """Returns reserved, taxed, and free liquid cash."""
        tax_reserve = 0.20 * sum(r.amount for r in self.receivables)
        obligations_7d = sum(
            ob.amount for ob in self.obligations
            if ob.due_date <= date.today() + timedelta(days=7) and ob.status == "pending"
        )
        free_liquid = max(0, self.bank_balance - obligations_7d - tax_reserve)
        return {
            "bank_balance": round(self.bank_balance, 2),
            "reserved": round(obligations_7d, 2),
            "taxed": round(tax_reserve, 2),
            "free_liquid": round(free_liquid, 2),
        }


# Singleton
_state = AppState()

def get_state() -> AppState:
    return _state
