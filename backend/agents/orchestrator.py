"""
DeltaCash – LangGraph Multi-Agent Orchestrator
Nodes: Analyzer → Prioritizer → Negotiator
Returns Chain-of-Thought reasoning JSON.
"""
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from models.schemas import (
    AgentAnalysisResult,
    LiquidityOutput,
    NegotiationEmail,
    Obligation,
    PrioritizedObligation,
    RelationshipType,
)

# ─── Try to initialise Gemini LLM ────────────────────────────────────────────
try:
    from langchain_google_genai import ChatGoogleGenerativeAI

    _llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY", ""),
        temperature=0.7,
    )
    LLM_AVAILABLE = bool(os.getenv("GOOGLE_API_KEY"))
except Exception:
    _llm = None
    LLM_AVAILABLE = False


# ─── Relationship weight mapping (for Prioritizer score) ─────────────────────
RELATIONSHIP_WEIGHT: Dict[str, float] = {
    RelationshipType.CRITICAL: 0.5,    # low denominator → high score (protect this)
    RelationshipType.IMPORTANT: 1.0,
    RelationshipType.FLEXIBLE: 2.0,    # high denominator → lower score (can delay)
}

URGENCY_DAYS_MAP = {1: 10, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1}


# ─── LangGraph State ─────────────────────────────────────────────────────────

class AgentState(TypedDict):
    liquidity_output: LiquidityOutput
    obligations: List[Obligation]
    dtz_critical: bool
    chain_of_thought: List[str]
    prioritized_obligations: List[PrioritizedObligation]
    suggested_actions: List[str]
    negotiation_emails: List[NegotiationEmail]
    analyzer_reasoning: str
    prioritizer_reasoning: str
    negotiator_reasoning: str


# ─── Node: Analyzer ──────────────────────────────────────────────────────────

def analyzer_node(state: AgentState) -> AgentState:
    """
    Identifies if DTZ < 10 days and flags obligations that are critical.
    """
    lo = state["liquidity_output"]
    dtz_days = lo.dtz_days
    dtz_critical = dtz_days is not None and dtz_days < 10

    cot = [f"[ANALYZER] Current DTZ: {dtz_days} days | Warning: {lo.warning_level.upper()}"]

    if dtz_critical:
        cot.append(
            f"[ANALYZER] ALERT: Days-to-Zero is {dtz_days} days — below critical threshold of 10."
        )
        cot.append(
            "[ANALYZER] Escalating to Prioritizer for immediate obligation triage."
        )
    else:
        cot.append(
            f"[ANALYZER] Liquidity appears stable at {dtz_days or 'N/A'} days. Performing routine prioritization."
        )

    flagged = [ob for ob in state["obligations"] if ob.status == "pending"]
    cot.append(f"[ANALYZER] Found {len(flagged)} pending obligations to evaluate.")

    reasoning = (
        f"DTZ is {'critical' if dtz_critical else 'stable'} at {dtz_days} days. "
        f"True Liquidity: ₹{lo.true_liquidity:,.0f}. "
        f"Tax reserve: ₹{lo.tax_reserve:,.0f}."
    )

    return {
        **state,
        "dtz_critical": dtz_critical,
        "chain_of_thought": cot,
        "analyzer_reasoning": reasoning,
    }


# ─── Node: Prioritizer ───────────────────────────────────────────────────────

def prioritizer_node(state: AgentState) -> AgentState:
    """
    Ranks obligations using:
        Score = (penalty_rate * urgency * 100) / relationship_weight
    Higher score = pay this first / protect relationship.
    Lower score = candidate for deferral.
    """
    cot = list(state["chain_of_thought"])
    cot.append("[PRIORITIZER] Computing priority scores for all obligations.")

    prioritized: List[PrioritizedObligation] = []
    suggested_actions: List[str] = []

    pending = [ob for ob in state["obligations"] if ob.status == "pending"]

    for ob in pending:
        rel_weight = RELATIONSHIP_WEIGHT.get(ob.relationship, 1.0)
        score = (ob.penalty_rate * ob.urgency * 100) / rel_weight

        # Recommendation logic
        if ob.relationship == RelationshipType.CRITICAL:
            action = f"PAY on time – {ob.vendor} is a Critical relationship. Do not delay."
            suggested_delay = 0
        elif score > 8:
            action = f"PAY ASAP – {ob.vendor} has high penalty risk (score: {score:.1f})."
            suggested_delay = 0
        elif state["dtz_critical"] and ob.relationship == RelationshipType.FLEXIBLE:
            delay_days = min(7, 30)
            action = f"DEFER {ob.vendor} by {delay_days} days to preserve liquidity."
            suggested_delay = delay_days
            suggested_actions.append(
                f"Delay {ob.vendor} payment (₹{ob.amount:,.0f}) by {delay_days} days"
            )
        else:
            action = f"MONITOR – {ob.vendor} is manageable; pay by due date."
            suggested_delay = 0

        reasoning_str = (
            f"Score={score:.2f} | penalty={ob.penalty_rate} | urgency={ob.urgency} | "
            f"relationship={ob.relationship} (weight={rel_weight})"
        )
        cot.append(f"[PRIORITIZER] {ob.vendor}: {reasoning_str}")

        prioritized.append(
            PrioritizedObligation(
                obligation=ob,
                priority_score=round(score, 3),
                reasoning=reasoning_str,
                recommended_action=action,
                suggested_delay_days=suggested_delay,
            )
        )

    # Sort: highest score first (highest priority to pay)
    prioritized.sort(key=lambda x: x.priority_score, reverse=True)

    prioritizer_reasoning = (
        f"Ranked {len(prioritized)} obligations. "
        f"Formula: Score = (penalty × urgency × 100) / relationship_weight. "
        f"Top priority: {prioritized[0].obligation.vendor if prioritized else 'None'}."
    )
    cot.append(f"[PRIORITIZER] {prioritizer_reasoning}")

    return {
        **state,
        "prioritized_obligations": prioritized,
        "suggested_actions": suggested_actions,
        "chain_of_thought": cot,
        "prioritizer_reasoning": prioritizer_reasoning,
    }


# ─── Node: Negotiator ────────────────────────────────────────────────────────

def negotiator_node(state: AgentState) -> AgentState:
    """
    For each obligation flagged for deferral, generate a negotiation email.
    Uses LLM if available; falls back to template-based generation.
    """
    cot = list(state["chain_of_thought"])
    cot.append("[NEGOTIATOR] Generating negotiation emails for deferral candidates.")

    emails: List[NegotiationEmail] = []
    deferral_candidates = [
        po for po in state["prioritized_obligations"] if po.suggested_delay_days > 0
    ]

    for po in deferral_candidates:
        ob = po.obligation
        tone = (
            "Humble/Urgent" if ob.relationship == RelationshipType.CRITICAL
            else "Firm/Strategic"
        )
        cot.append(
            f"[NEGOTIATOR] Drafting email to {ob.vendor} with tone: {tone} | delay: {po.suggested_delay_days}d"
        )

        if LLM_AVAILABLE and _llm:
            email_body = _generate_email_llm(ob, po.suggested_delay_days, tone)
        else:
            email_body = _generate_email_template(ob, po.suggested_delay_days, tone)

        subject = (
            f"Request for Payment Deferral – {ob.vendor} (₹{ob.amount:,.0f})"
            if tone == "Humble/Urgent"
            else f"Payment Schedule Adjustment – {ob.vendor}"
        )

        emails.append(
            NegotiationEmail(
                obligation_id=ob.id,
                vendor=ob.vendor,
                tone=tone,
                subject=subject,
                body=email_body,
                reasoning=(
                    f"Relationship: {ob.relationship} → Tone: {tone}. "
                    f"Requesting {po.suggested_delay_days}-day extension."
                ),
            )
        )

    negotiator_reasoning = (
        f"Generated {len(emails)} negotiation email(s). "
        f"LLM used: {LLM_AVAILABLE}. "
        f"Tone selection: Critical→Humble/Urgent, Flexible→Firm/Strategic."
    )
    cot.append(f"[NEGOTIATOR] {negotiator_reasoning}")

    return {
        **state,
        "negotiation_emails": emails,
        "chain_of_thought": cot,
        "negotiator_reasoning": negotiator_reasoning,
    }


# ─── Email Generators ─────────────────────────────────────────────────────────

def _generate_email_llm(ob: Obligation, delay_days: int, tone: str) -> str:
    """Generate email using Google Gemini."""
    tone_instruction = (
        "Use a Humble and Urgent tone. Acknowledge the difficulty. Express sincere intent to pay."
        if tone == "Humble/Urgent"
        else "Use a Firm and Strategic tone. Present this as a mutual benefit and business decision."
    )
    prompt = f"""You are a CFO at an SME writing to a vendor/supplier.
    
Vendor: {ob.vendor}
Payment Amount: ₹{ob.amount:,.0f}
Original Due Date: {ob.due_date}
Requested Delay: {delay_days} days
Tone: {tone_instruction}

Write a professional email body (no subject line) requesting a {delay_days}-day payment extension.
Keep it under 150 words. Be specific about the amount and new proposed date."""

    try:
        response = _llm.invoke([HumanMessage(content=prompt)])
        return response.content
    except Exception as e:
        return _generate_email_template(ob, delay_days, tone)


def _generate_email_template(ob: Obligation, delay_days: int, tone: str) -> str:
    """Fallback template-based email generation."""
    from datetime import timedelta

    new_date = ob.due_date + timedelta(days=delay_days)

    if tone == "Humble/Urgent":
        return f"""Dear {ob.vendor} Team,

I hope this message finds you well. I am writing with a sincere and urgent request regarding our upcoming payment of ₹{ob.amount:,.0f} due on {ob.due_date}.

Due to unexpected short-term cash flow constraints, we respectfully request a brief deferral of {delay_days} days, with the revised payment date being {new_date}.

We deeply value our relationship with {ob.vendor} and commit to honouring this obligation in full by the proposed date.

We sincerely apologise for any inconvenience this may cause and are available to discuss immediately.

Warm regards,
Finance Team
DeltaCash SME"""
    else:
        return f"""Dear {ob.vendor} Team,

I am writing to inform you of a scheduled adjustment to our payment timeline for the amount of ₹{ob.amount:,.0f}, originally due on {ob.due_date}.

As part of our quarterly cash flow optimisation strategy, we are proposing to shift this payment by {delay_days} days to {new_date}. This is a strategic realignment and does not affect the total amount.

We believe this adjustment serves our continued business partnership well. Please confirm your acceptance at your earliest convenience.

Best regards,
Finance Team
DeltaCash SME"""


# ─── Graph Assembly ───────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)
    graph.add_node("analyzer", analyzer_node)
    graph.add_node("prioritizer", prioritizer_node)
    graph.add_node("negotiator", negotiator_node)

    graph.set_entry_point("analyzer")
    graph.add_edge("analyzer", "prioritizer")
    graph.add_edge("prioritizer", "negotiator")
    graph.add_edge("negotiator", END)

    return graph.compile()


# Singleton compiled graph
_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


def run_analysis(liquidity_output: LiquidityOutput, obligations: List[Obligation]) -> AgentAnalysisResult:
    """Entry point: run the full Analyzer→Prioritizer→Negotiator pipeline."""
    initial_state: AgentState = {
        "liquidity_output": liquidity_output,
        "obligations": obligations,
        "dtz_critical": False,
        "chain_of_thought": [],
        "prioritized_obligations": [],
        "suggested_actions": [],
        "negotiation_emails": [],
        "analyzer_reasoning": "",
        "prioritizer_reasoning": "",
        "negotiator_reasoning": "",
    }

    graph = get_graph()
    final_state = graph.invoke(initial_state)

    return AgentAnalysisResult(
        dtz_critical=final_state["dtz_critical"],
        dtz_days=liquidity_output.dtz_days,
        chain_of_thought=final_state["chain_of_thought"],
        prioritized_obligations=final_state["prioritized_obligations"],
        suggested_actions=final_state["suggested_actions"],
        negotiation_emails=final_state["negotiation_emails"],
        analyzer_reasoning=final_state["analyzer_reasoning"],
        prioritizer_reasoning=final_state["prioritizer_reasoning"],
        negotiator_reasoning=final_state["negotiator_reasoning"],
    )
