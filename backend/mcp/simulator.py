"""
DeltaCash – MCP Simulator
Returns mock bank data conforming to the Model Context Protocol interface.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import List

from models.schemas import MCPBankData, MCPTransaction


# Mock data store – simulates what an MCP bank integration would return
_MOCK_TRANSACTIONS: List[dict] = [
    {"id": "txn_001", "date": -1,  "amount": -45000.00,  "description": "Office Rent – Alliance Properties",  "type": "debit"},
    {"id": "txn_002", "date": -2,  "amount": 120000.00, "description": "Client Payment – Acme Corp Invoice #2243", "type": "credit"},
    {"id": "txn_003", "date": -3,  "amount": -22000.00,  "description": "AWS Cloud Services – Monthly",           "type": "debit"},
    {"id": "txn_004", "date": -5,  "amount": -18500.00,  "description": "Salary Advance – Operations Staff",       "type": "debit"},
    {"id": "txn_005", "date": -6,  "amount": 75000.00,  "description": "Client Payment – Global Tech Q1",          "type": "credit"},
    {"id": "txn_006", "date": -7,  "amount": -9800.00,   "description": "Internet & Utilities – BSNL",             "type": "debit"},
    {"id": "txn_007", "date": -8,  "amount": 200000.00, "description": "Project Milestone – XYZ Distributors",    "type": "credit"},
    {"id": "txn_008", "date": -10, "amount": -55000.00,  "description": "GST Payment – March Quarter",             "type": "debit"},
    {"id": "txn_009", "date": -12, "amount": -12000.00,  "description": "Software Licences – Adobe, Figma",        "type": "debit"},
    {"id": "txn_010", "date": -15, "amount": 90000.00,  "description": "Retainer Fee – City Logistics Ltd",        "type": "credit"},
]


def get_bank_data(account_id: str = "ACC-DELTA-001") -> MCPBankData:
    """
    Simulate fetching bank data via MCP protocol.
    Returns standardized JSON conforming to MCPBankData schema.
    """
    today = date.today()

    transactions: List[MCPTransaction] = [
        MCPTransaction(
            id=t["id"],
            date=today + timedelta(days=t["date"]),
            amount=t["amount"],
            description=t["description"],
            type=t["type"],
        )
        for t in _MOCK_TRANSACTIONS
    ]

    return MCPBankData(
        account_id=account_id,
        account_name="DeltaCash Operating Account",
        balance=485000.00,
        credit_limit=500000.00,
        available_credit=350000.00,
        transactions=transactions,
        fetched_at=datetime.utcnow(),
        source="mcp_simulator",
    )


def get_mcp_protocol_response(account_id: str = "ACC-DELTA-001") -> dict:
    """
    Returns the full MCP-compliant JSON envelope.
    MCP = Model Context Protocol – standardized context injection for LLMs.
    """
    bank_data = get_bank_data(account_id)

    return {
        "mcp_version": "1.0",
        "resource_type": "banking.account",
        "resource_id": account_id,
        "timestamp": datetime.utcnow().isoformat(),
        "context": {
            "account_summary": {
                "id": bank_data.account_id,
                "name": bank_data.account_name,
                "balance": bank_data.balance,
                "credit_limit": bank_data.credit_limit,
                "available_credit": bank_data.available_credit,
            },
            "recent_transactions": [
                {
                    "id": t.id,
                    "date": t.date.isoformat(),
                    "amount": t.amount,
                    "description": t.description,
                    "type": t.type,
                }
                for t in bank_data.transactions
            ],
            "derived_insights": {
                "30d_avg_daily_outflow": round(
                    sum(abs(t.amount) for t in bank_data.transactions if t.type == "debit") / 30,
                    2,
                ),
                "30d_total_inflow": sum(t.amount for t in bank_data.transactions if t.type == "credit"),
                "30d_total_outflow": sum(abs(t.amount) for t in bank_data.transactions if t.type == "debit"),
            },
        },
        "data": bank_data.model_dump(mode="json"),
    }
