"use client";

import React, { useEffect, useState } from "react";
import { LiquidityData, AgentAction, DashboardSummary, CibilData, Obligation } from "@/types";
import {
  fetchLiquidity,
  triggerAgentAnalysis,
  fetchDashboardSummary,
  fetchCibil,
  commitDelay,
} from "@/lib/api";

import { DTZGauge } from "@/components/DTZGauge";
import { LiquidityGraph } from "@/components/LiquidityGraph";
import { ObligationsList } from "@/components/ObligationsList";
import { ActionCenter } from "@/components/ActionCenter";
import { Loader2, ArrowUpRight, Wallet, Activity, Sparkles, X, Mail, Coins, ShieldCheck, CheckCircle2 } from "lucide-react";

export function HomeTab() {
  const [liquidity, setLiquidity] = useState<LiquidityData | null>(null);
  const [agentData, setAgentData] = useState<AgentAction | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [cibil, setCibil] = useState<CibilData | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalType, setModalType] = useState<'email' | 'micropayment' | null>(null);
  const [modalObligation, setModalObligation] = useState<Obligation | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState<'pre'|'post'>('pre');
  const [emailTone, setEmailTone] = useState<'firm'|'apologetic'>('apologetic');

  const loadData = async () => {
    try {
      const [liq, agent, sum, cib] = await Promise.all([
        fetchLiquidity(),
        triggerAgentAnalysis(),
        fetchDashboardSummary(),
        fetchCibil(),
      ]);
      setLiquidity(liq);
      setAgentData(agent);
      setSummary(sum);
      setCibil(cib);
    } catch (err) {
      console.error("Failed to load home data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDragDelay = async (newOrder: any[], obligationId?: string, shiftIndex?: number) => {
    if (!obligationId || !shiftIndex || shiftIndex <= 0) return;
    const delayDays = shiftIndex * 3;
    try {
      await commitDelay(obligationId, delayDays);
      await loadData();
    } catch (err) {
      console.error("Failed to commit delay", err);
    }
  };

  const openModal = (type: 'email' | 'micropayment', ob: Obligation) => {
    setModalType(type);
    setModalObligation(ob);
    setIsSent(false);
    setIsSending(false);
  };

  const handleActionSubmit = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setIsSent(true);
      setTimeout(() => {
        setModalType(null);
      }, 1500);
    }, 1500);
  };

  if (loading || !liquidity || !summary || !cibil) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="animate-spin text-primary mb-6" size={48} />
        <h2 className="text-xl font-bold tracking-tight text-foreground animate-pulse">Orchestrating Liquidity...</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* True Liquidity */}
        <div className="bg-card rounded-2xl p-6 border border-border relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Wallet size={64} className="text-primary"/>
          </div>
          <p className="text-sm font-bold text-muted-foreground uppercase mb-2">True Liquidity</p>
          <h3 className="text-3xl font-black text-foreground">₹{liquidity.true_liquidity.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-2 text-sm text-success font-bold">
            <ArrowUpRight size={16} /> +12.5% this month
          </div>
        </div>

        {/* CIBIL Score */}
        <div className="bg-card rounded-2xl p-6 border border-border flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-sm font-bold text-muted-foreground uppercase">CIBIL Score</p>
            <Activity className={cibil.color === "green" ? "text-success" : cibil.color === "yellow" ? "text-yellow-500" : "text-destructive"} size={20} />
          </div>
          <div className="flex items-end gap-3 mt-2">
            <h3 className="text-4xl font-black">{cibil.score}</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
              cibil.color === "green" ? "bg-success/20 text-success" : 
              cibil.color === "yellow" ? "bg-yellow-500/20 text-yellow-600" : 
              "bg-destructive/10 text-destructive"
            }`}>{cibil.rating}</span>
          </div>
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full ${cibil.color === "green" ? "bg-success" : cibil.color === "yellow" ? "bg-yellow-500" : "bg-destructive"}`} style={{ width: `${(cibil.score / 900) * 100}%` }}></div>
          </div>
        </div>

        {/* Cash Breakdown */}
        <div className="bg-card rounded-2xl p-5 border border-border lg:col-span-2 flex items-center justify-between shadow-sm">
          <div className="w-full">
            <p className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-primary" /> Cash Breakdown
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">Free Liquid</p>
                <p className="text-lg font-black text-success">₹{(summary.cash_breakdown.free_liquid || 0).toLocaleString()}</p>
              </div>
              <div className="border-l border-border pl-4">
                <p className="text-xs text-muted-foreground font-semibold mb-1">Tax Reserved</p>
                <p className="text-lg font-black text-yellow-600">₹{(summary.cash_breakdown.taxed || 0).toLocaleString()}</p>
              </div>
              <div className="border-l border-border pl-4">
                <p className="text-xs text-muted-foreground font-semibold mb-1">Committed Total</p>
                <p className="text-lg font-black text-destructive">₹{(summary.cash_breakdown.reserved || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="w-full h-2 flex rounded-full overflow-hidden mt-4 opacity-90 shadow-inner">
              <div className="bg-success" style={{ flex: summary.cash_breakdown.free_liquid }}></div>
              <div className="bg-yellow-500" style={{ flex: summary.cash_breakdown.taxed }}></div>
              <div className="bg-destructive" style={{ flex: summary.cash_breakdown.reserved }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-4 relative shadow-sm">
          <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="font-extrabold text-lg text-foreground">30-Day Liquidity Forecast</h3>
          </div>
          <div className="h-72">
            <LiquidityGraph data={liquidity.daily_projections} />
          </div>
        </div>

        <div className="lg:col-span-1 h-[400px]">
          {agentData && (
            <ActionCenter actions={agentData.prioritized_obligations} emails={agentData.negotiation_emails} />
          )}
        </div>
      </div>

      {/* Lower Row: Payments */}
      <div className="h-[500px]">
        <ObligationsList obligations={liquidity.obligations} onOrderChange={handleDragDelay} onHoverAction={openModal} />
      </div>

      {/* ─── Hover Modals ─── */}
      {modalType && modalObligation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-border p-6 relative animate-scale-in">
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"><X size={20}/></button>
            
            {modalType === 'email' && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-primary/10 rounded-xl"><Mail size={24} className="text-primary"/></div>
                  <div>
                    <h2 className="text-xl font-black">AI Email Negotiator</h2>
                    <p className="text-sm text-muted-foreground font-medium">To: {modalObligation.vendor}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase">Context</label>
                    <div className="flex gap-2 mt-2">
                      <button onClick={()=>setEmailTemplate('pre')} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${emailTemplate === 'pre' ? 'bg-primary/10 border-primary text-primary' : 'bg-background hover:bg-muted'}`}>Pre-Deadline Extension</button>
                      <button onClick={()=>setEmailTemplate('post')} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${emailTemplate === 'post' ? 'bg-primary/10 border-primary text-primary' : 'bg-background hover:bg-muted'}`}>Delayed Settlement</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase">Tone via AI</label>
                    <p className="text-xs text-muted-foreground mb-2 italic">Vendor strictness: {modalObligation.relationship}</p>
                    <div className="flex gap-2">
                      <button onClick={()=>setEmailTone('apologetic')} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${emailTone === 'apologetic' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-600' : 'bg-background hover:bg-muted'}`}>Apologetic & Polite</button>
                      <button onClick={()=>setEmailTone('firm')} className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${emailTone === 'firm' ? 'bg-success/10 border-success text-success' : 'bg-background hover:bg-muted'}`}>Firm & Assured</button>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-xl border border-border text-sm font-medium mb-6 animate-fade-in relative">
                   <div className="absolute -top-3 right-4 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">AI Generated</div>
                   <span className="text-muted-foreground">Subject: </span> Payment update regarding pending invoice ₹{modalObligation.amount.toLocaleString()}<br/><br/>
                   Dear {modalObligation.vendor} Team,<br/>
                   {emailTone === 'apologetic' ? `We sincerely apologize, but we need to request a brief extension for this payment.` : `We are writing to inform you that this payment will be scheduled next week as we align our billing cycle.`}
                   {emailTemplate === 'post' ? ` We understand it is past the deadline and we will incur the 2% penalty.` : ` We are asking proactively before the deadline hits.`}
                   <br/><br/>Regards,<br/>DeltaCash Orch.
                </div>
              </>
            )}

            {modalType === 'micropayment' && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-success/10 rounded-xl"><Coins size={24} className="text-success"/></div>
                  <div>
                    <h2 className="text-xl font-black">AI Micropayment Strategy</h2>
                    <p className="text-sm text-muted-foreground font-medium">Vendor: {modalObligation.vendor}</p>
                  </div>
                </div>

                <div className="bg-success/5 border border-success/20 p-4 rounded-xl mb-6 flex gap-3">
                  <ShieldCheck size={20} className="text-success flex-shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-sm font-bold text-success">AI Reasoning</p>
                    <p className="text-xs text-foreground mt-1 leading-relaxed">Splitting this ₹{modalObligation.amount.toLocaleString()} payment avoids triggering the 14-day zero-cash cliff event while maintaining {modalObligation.relationship} relationship health.</p>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Payment Slicing Simulation</label>
                  <label className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="slice" className="w-4 h-4 text-primary bg-background border-border focus:ring-primary"/>
                      <div>
                        <p className="font-bold text-sm">10% Tranche</p>
                        <p className="text-xs text-muted-foreground">₹{(modalObligation.amount*0.1).toLocaleString()} today</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-success">+3 Days DTZ</span>
                  </label>
                  <label className="flex items-center justify-between p-3 border border-primary/30 bg-primary/5 rounded-xl cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="slice" defaultChecked className="w-4 h-4 text-primary bg-background border-border focus:ring-primary"/>
                      <div>
                        <p className="font-bold text-sm">25% Tranche (Recommended)</p>
                        <p className="text-xs text-muted-foreground">₹{(modalObligation.amount*0.25).toLocaleString()} today</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-success">+7 Days DTZ</span>
                  </label>
                  <label className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="slice" className="w-4 h-4 text-primary bg-background border-border focus:ring-primary"/>
                      <div>
                        <p className="font-bold text-sm">50% Tranche</p>
                        <p className="text-xs text-muted-foreground">₹{(modalObligation.amount*0.5).toLocaleString()} today</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary">+14 Days DTZ</span>
                  </label>
                </div>
              </>
            )}

            <button 
              onClick={handleActionSubmit}
              disabled={isSending || isSent}
              className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                isSent ? 'bg-success text-white' : 
                isSending ? 'bg-muted text-muted-foreground cursor-not-allowed' : 
                modalType === 'email' ? 'gradient-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02]' 
                : 'bg-success text-white shadow-lg shadow-success/20 hover:scale-[1.02]'
              }`}
            >
              {isSending ? <><Loader2 size={18} className="animate-spin"/> processing...</> :
               isSent ? <><CheckCircle2 size={18}/> Operation Successful</> :
               modalType === 'email' ? 'Send AI Email' : 'Simulate Partial Payment'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
