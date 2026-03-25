from fastapi import APIRouter

router = APIRouter(prefix="/api/mcp", tags=["MCP"])

from mcp.simulator import get_mcp_protocol_response

@router.get("/bank-data")
def get_mcp_bank_data():
    """Fetch bank data using the mock MCP simulator."""
    return get_mcp_protocol_response()
