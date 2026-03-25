export type RelationshipType = 'Critical' | 'Important' | 'Flexible';
export type WarningLevel = 'green' | 'yellow' | 'red';

export interface Obligation {
  id: string;
  vendor: string;
  amount: number;
  due_date: string;
  relationship: RelationshipType;
  penalty_rate: number;
  urgency: number;
  status: 'pending' | 'overdue' | 'paid' | 'deferred';
  category: string;
  notes?: string;
  deferred_days: number;
}

export interface Receivable {
  id: string;
  payer: string;
  amount: number;
  expected_date: string;
  confidence: number;
  historical_delay_factor: number;
  notes?: string;
}

export interface DailyProjection {
  date: string;
  committed: number;
  available: number;
  cumulative_inflow: number;
  cumulative_outflow: number;
}

export interface LiquidityData {
  true_liquidity: number;
  dtz_date: string | null;
  dtz_days: number | null;
  daily_projections: DailyProjection[];
  obligations: Obligation[];
  tax_reserve: number;
  obligations_due_7d: number;
  warning_level: WarningLevel;
  stress_test_active: boolean;
}

export interface PrioritizedObligation {
  obligation: Obligation;
  priority_score: number;
  reasoning: string;
  recommended_action: string;
  suggested_delay_days: number;
}

export interface NegotiationEmail {
  obligation_id: string;
  vendor: string;
  tone: string;
  subject: string;
  body: string;
  reasoning: string;
}

export interface AgentAction {
  dtz_critical: boolean;
  dtz_days: number | null;
  chain_of_thought: string[];
  prioritized_obligations: PrioritizedObligation[];
  suggested_actions: string[];
  negotiation_emails: NegotiationEmail[];
  analyzer_reasoning: string;
  prioritizer_reasoning: string;
  negotiator_reasoning: string;
}

export interface OCRResult {
  vendor: string | null;
  total: number | null;
  date: string | null;
  raw_text: string;
  confidence: number;
  duplicate_match: string | null;
  is_duplicate: boolean;
  extraction_method: string;
}

export interface SimulateDelayResponse {
  obligation_id: string;
  original_due_date: string;
  new_due_date: string;
  original_dtz_days: number | null;
  new_dtz_days: number | null;
  delta_days: number;
  impact: 'improved' | 'unchanged' | 'worsened';
  updated_liquidity: LiquidityData;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  vendor: string | null;
  category: string;
  source: string;
}

export interface CashBreakdown {
  bank_balance: number;
  reserved: number;
  taxed: number;
  free_liquid: number;
}

export interface CibilData {
  score: number;
  rating: string;
  color: string;
  history: { month: string; score: number }[];
  factors: Record<string, number>;
}

export interface MLReasoningStep {
  feature: string;
  value: number;
  importance: number;
  impact: 'high' | 'medium' | 'low';
  explanation: string;
}

export interface MLPrediction {
  receivable_id: string;
  payer: string;
  original_date: string;
  predicted_date: string;
  predicted_delay_days: number;
  adjusted_confidence: number;
  rf_prediction: number;
  gb_prediction: number;
  ensemble_prediction: number;
  method: string;
  feature_values: Record<string, number>;
  feature_importances: Record<string, number>;
  reasoning_chain: MLReasoningStep[];
  risk_level: 'high' | 'medium' | 'low';
}

export interface MLPortfolioSummary {
  total_receivables: number;
  at_risk_amount: number;
  at_risk_pct: number;
  avg_predicted_delay_days: number;
  predictions: MLPrediction[];
  model_method: string;
  feature_importances: Record<string, number>;
}

export interface DashboardSummary {
  bank_balance: number;
  pending_obligations: number;
  pending_total: number;
  overdue_count: number;
  overdue_total: number;
  monthly_spend: number;
  monthly_income: number;
  cash_breakdown: CashBreakdown;
  category_spend: Record<string, number>;
}

export interface InvestmentTip {
  category: string;
  icon: string;
  title: string;
  description: string;
  impact: string;
  risk: string;
  confidence: number;
}

export type AppTab = 'home' | 'timeline' | 'input' | 'calculator';

export interface User {
  username: string;
  company: string;
}
