"""
DeltaCash – Pydantic Schemas
All data contracts for the system.
"""
from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ────────────────────────────────────────────────────────────────────────────
# Enums
# ────────────────────────────────────────────────────────────────────────────


class RelationshipType(str, Enum):
    CRITICAL = "Critical"
    IMPORTANT = "Important"
    FLEXIBLE = "Flexible"


class ObligationStatus(str, Enum):
    PENDING = "pending"
    OVERDUE = "overdue"
    PAID = "paid"
    DEFERRED = "deferred"


# ────────────────────────────────────────────────────────────────────────────
# Core Domain Models
# ────────────────────────────────────────────────────────────────────────────


class Obligation(BaseModel):
    id: str = Field(..., description="Unique obligation identifier")
    vendor: str
    amount: float = Field(..., gt=0, description="Amount in INR")
    due_date: date
    relationship: RelationshipType = RelationshipType.IMPORTANT
    penalty_rate: float = Field(
        default=0.02, description="Penalty as fraction per day if delayed"
    )
    urgency: int = Field(
        default=5, ge=1, le=10, description="Urgency score 1-10"
    )
    status: ObligationStatus = ObligationStatus.PENDING
    category: str = "General"
    notes: Optional[str] = None
    deferred_days: int = 0


class Receivable(BaseModel):
    id: str
    payer: str
    amount: float = Field(..., gt=0)
    expected_date: date
    confidence: float = Field(
        default=0.8, ge=0.0, le=1.0, description="ML confidence of on-time payment"
    )
    historical_delay_factor: float = Field(
        default=0.0, description="Average days late historically"
    )
    notes: Optional[str] = None


class Transaction(BaseModel):
    id: str
    date: date
    amount: float  # positive = credit, negative = debit
    description: str
    vendor: Optional[str] = None
    category: str = "Uncategorized"
    source: str = "manual"  # manual | ocr | mcp


class UserSession(BaseModel):
    user_id: str
    company_name: str
    currency: str = "INR"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    stress_test_active: bool = False


# ────────────────────────────────────────────────────────────────────────────
# Request / Response Schemas
# ────────────────────────────────────────────────────────────────────────────


class LiquidityInput(BaseModel):
    current_balance: float = Field(..., gt=0, description="Current bank balance in INR")
    obligations: List[Obligation]
    expected_receivables: List[Receivable]
    stress_test: bool = False
    stress_test_days: int = 30


class DailyProjection(BaseModel):
    date: date
    committed: float   # locked outflows up to this date
    available: float   # projected available cash
    cumulative_inflow: float
    cumulative_outflow: float


class LiquidityOutput(BaseModel):
    true_liquidity: float
    dtz_date: Optional[date]
    dtz_days: Optional[int]
    daily_projections: List[DailyProjection]
    obligations: List[Obligation]
    tax_reserve: float
    obligations_due_7d: float
    warning_level: str  # green | yellow | red
    stress_test_active: bool = False


class SimulateDelayRequest(BaseModel):
    obligation_id: str
    days: int = Field(..., ge=1, le=90, description="Number of days to defer")
    current_balance: float
    obligations: List[Obligation]
    expected_receivables: List[Receivable]


class SimulateDelayResponse(BaseModel):
    obligation_id: str
    original_due_date: date
    new_due_date: date
    original_dtz_days: Optional[int]
    new_dtz_days: Optional[int]
    delta_days: int
    impact: str  # "improved" | "unchanged" | "worsened"
    updated_liquidity: LiquidityOutput


# ────────────────────────────────────────────────────────────────────────────
# Agent Schemas
# ────────────────────────────────────────────────────────────────────────────


class PrioritizedObligation(BaseModel):
    obligation: Obligation
    priority_score: float
    reasoning: str
    recommended_action: str
    suggested_delay_days: int = 0


class NegotiationEmail(BaseModel):
    obligation_id: str
    vendor: str
    tone: str
    subject: str
    body: str
    reasoning: str


class AgentAnalysisResult(BaseModel):
    dtz_critical: bool
    dtz_days: Optional[int]
    chain_of_thought: List[str]
    prioritized_obligations: List[PrioritizedObligation]
    suggested_actions: List[str]
    negotiation_emails: List[NegotiationEmail]
    analyzer_reasoning: str
    prioritizer_reasoning: str
    negotiator_reasoning: str


# ────────────────────────────────────────────────────────────────────────────
# OCR & MCP Schemas
# ────────────────────────────────────────────────────────────────────────────


class OCRResult(BaseModel):
    vendor: Optional[str]
    total: Optional[float]
    date: Optional[date]
    raw_text: str
    confidence: float
    duplicate_match: Optional[str] = None
    is_duplicate: bool = False
    extraction_method: str = "regex"  # "easyocr" | "regex"


class MCPTransaction(BaseModel):
    id: str
    date: date
    amount: float
    description: str
    type: str  # debit | credit


class MCPBankData(BaseModel):
    account_id: str
    account_name: str
    balance: float
    credit_limit: float
    available_credit: float
    transactions: List[MCPTransaction]
    fetched_at: datetime
    source: str = "mcp_simulator"
