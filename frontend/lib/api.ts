import {
  LiquidityData, AgentAction, OCRResult, SimulateDelayResponse,
  CibilData, CashBreakdown, Transaction, DashboardSummary,
  MLPortfolioSummary, InvestmentTip, Obligation
} from "@/types";

const API_BASE = "http://localhost:8000/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

// ─── Liquidity ────────────────────────────────────────────────────────────
export const fetchLiquidity = () => apiFetch<LiquidityData>("/liquidity");

// ─── Simulate drag-defer ──────────────────────────────────────────────────
export function simulateDelay(obligationId: string, days: number): Promise<SimulateDelayResponse> {
  return apiFetch("/simulate/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ obligation_id: obligationId, days, current_balance: 0, obligations: [], expected_receivables: [] }),
  });
}

export function commitDelay(obligationId: string, days: number): Promise<{ updated_liquidity: LiquidityData; success: boolean }> {
  return apiFetch("/simulate/commit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ obligation_id: obligationId, days, current_balance: 0, obligations: [], expected_receivables: [] }),
  });
}

// ─── Agent ────────────────────────────────────────────────────────────────
export const triggerAgentAnalysis = () => apiFetch<AgentAction>("/agent/analyze");

// ─── Stress test ─────────────────────────────────────────────────────────
export function triggerStressTest(): Promise<{ liquidity: LiquidityData; agentData: AgentAction }> {
  return apiFetch("/stress-test", { method: "POST" });
}

// ─── Dashboard ────────────────────────────────────────────────────────────
export const fetchDashboardSummary = () => apiFetch<DashboardSummary>("/dashboard/summary");
export const fetchCibil = () => apiFetch<CibilData>("/dashboard/cibil");
export const fetchCashBreakdown = () => apiFetch<CashBreakdown>("/dashboard/cash-breakdown");
export const fetchTransactions = (limit = 100) => apiFetch<{ transactions: Transaction[] }>(`/dashboard/transactions?limit=${limit}`);

// ─── Obligations ──────────────────────────────────────────────────────────
export const fetchObligations = () => apiFetch<{ obligations: Obligation[] }>("/obligations");

export function addObligation(data: {
  vendor: string; amount: number; due_date: string;
  relationship: string; penalty_rate: number; urgency: number;
  category: string; notes?: string;
}): Promise<{ obligation: Obligation; updated_liquidity: LiquidityData }> {
  return apiFetch("/obligations/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// ─── ML ───────────────────────────────────────────────────────────────────
export const fetchMLPredictions = () => apiFetch<MLPortfolioSummary>("/ml/predict");
export const fetchMLStatus = () => apiFetch<Record<string, unknown>>("/ml/status");
export const fetchInvestmentTips = () => apiFetch<{ tips: InvestmentTip[] }>("/ml/tips");

// ─── OCR Upload ───────────────────────────────────────────────────────────
export async function uploadFile(file: File): Promise<OCRResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}
