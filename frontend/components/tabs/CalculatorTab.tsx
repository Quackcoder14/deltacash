"use client";

import React, { useState, useEffect } from "react";
import { MLPortfolioSummary, InvestmentTip, LiquidityData, Obligation } from "@/types";
import { fetchMLPredictions, fetchInvestmentTips, fetchLiquidity, fetchObligations } from "@/lib/api";
import { DTZGauge } from "@/components/DTZGauge";
import { Loader2, Brain, TrendingUp, Info, Plus, Minus, ArrowRight, Save, PlayCircle, BarChart3, AlertCircle } from "lucide-react";

import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";

type SimToken = {
    id: string;
    type: 'payment' | 'tip';
    title: string;
    description: string;
    dtzImpact: number;
    cashImpact: number;
    icon?: React.ReactNode;
};

export function CalculatorTab() {
  const [mlData, setMlData] = useState<MLPortfolioSummary | null>(null);
  const [liquidity, setLiquidity] = useState<LiquidityData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // DND State for Simulator
  const [availableTokens, setAvailableTokens] = useState<SimToken[]>([]);
  const [activeScenario, setActiveScenario] = useState<SimToken[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [ml, tipData, liq, obs] = await Promise.all([
          fetchMLPredictions(),
          fetchInvestmentTips(),
          fetchLiquidity(),
          fetchObligations()
        ]);
        setMlData(ml);
        setLiquidity(liq);
        
        // Build initial available tokens
        const tokens: SimToken[] = [];
        
        // Map Tips
        if (tipData && tipData.tips) {
            tipData.tips.forEach((t, i) => {
                tokens.push({
                    id: `tip_${i}`,
                    type: 'tip',
                    title: t.title,
                    description: t.description,
                    dtzImpact: i === 0 ? 5 : i === 1 ? 12 : 2, 
                    cashImpact: i === 0 ? -50000 : i === 1 ? 4200 : 15000,
                    icon: <TrendingUp className="text-success" size={16}/>
                });
            });
        }

        // Map highest pending payments safely
        if (obs && obs.obligations) {
            const pending = obs.obligations.filter(o => o.status === 'pending').sort((a,b) => b.amount - a.amount).slice(0, 5);
            pending.forEach(p => {
                // Pitch UI logic: Show assumptions explicitly, previous delays, and relationship damage risk vs DTZ
                const isFlexible = p.relationship.toLowerCase() === 'flexible';
                const damageRisk = isFlexible ? 'Low' : 'Severe';
                const previousDelays = isFlexible ? 2 : 0;
                const desc = `Delay Outcome: Retain ₹${p.amount.toLocaleString()} + extend DTZ by ~${Math.round(p.amount/12000)} days. \n\nAI ASSUMPTIONS & RISKS:\n• Trust Damage Risk: ${damageRisk} (${p.relationship})\n• Hist. Delays w/ vendor: ${previousDelays}\n• Est. Uncertainty limit: ±15% vendor approval confidence.`;
                
                tokens.push({
                    id: `pay_${p.id}`,
                    type: 'payment',
                    title: `Simulate Delay: ${p.vendor}`,
                    description: desc,
                    dtzImpact: Math.max(1, Math.round(p.amount / 12000)), 
                    cashImpact: p.amount,
                    icon: <AlertCircle className="text-destructive" size={16}/>
                });
            });
        }

        setAvailableTokens(tokens);

      } catch (e) {
        console.error("API Load Failed", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleAddToken = (token: SimToken) => {
      setAvailableTokens(prev => prev.filter(t => t.id !== token.id));
      setActiveScenario(prev => [...prev, token]);
  };

  const handleRemoveToken = (token: SimToken) => {
      setActiveScenario(prev => prev.filter(t => t.id !== token.id));
      setAvailableTokens(prev => [token, ...prev]);
  };

  if (loading || !mlData || !liquidity) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  }

  const baseDTZ = liquidity.dtz_days ?? 0;
  const baseCash = liquidity.true_liquidity;
  
  const simDTZDelta = activeScenario.reduce((acc, t) => acc + t.dtzImpact, 0);
  const simCashDelta = activeScenario.reduce((acc, t) => acc + t.cashImpact, 0);

  const finalDTZ = baseDTZ + simDTZDelta;
  const finalCash = baseCash + simCashDelta;

  const graphData = [
      { name: 'Baseline', DTZ: baseDTZ, Liquidity: baseCash },
      { name: 'Simulated', DTZ: finalDTZ, Liquidity: finalCash },
  ];

  // AI Explainability Generation
  let strategyScore = 50;
  if (simDTZDelta > 10) strategyScore += 30;
  else if (simDTZDelta > 0) strategyScore += 15;
  if (simCashDelta < 0) strategyScore -= 10;
  
  const explainPoints = [];
  if (activeScenario.length === 0) {
      explainPoints.push("Drag tokens into the sandbox to generate an impact assessment.");
  } else {
      if (simCashDelta > 0) explainPoints.push(`Capital Retention: Retaining ₹${simCashDelta.toLocaleString()} heavily cushions next month's burn rate.`);
      else if (simCashDelta < 0) explainPoints.push(`Liquidity Drain: Spending ₹${Math.abs(simCashDelta).toLocaleString()} upfront stresses 14-day cashflow, ensure receivables land on time.`);
      
      if (simDTZDelta > 0) explainPoints.push(`Runway Extension: Structural decisions add ${simDTZDelta} days to operational survival.`);
      
      const paymentsDelayed = activeScenario.filter(t => t.type === 'payment').length;
      if (paymentsDelayed > 0) explainPoints.push(`Vendor Strain: Deferring ${paymentsDelayed} key payments may incur slight relationship friction or late penalties (~2% APY).`);
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* ─── Top Block: DTZ & Glass Box ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-3xl p-6 border border-border flex flex-col items-center justify-center relative shadow-sm min-h-[350px]">
            <h3 className="text-xl font-bold mb-2">Days to Zero (DTZ)</h3>
            <p className="text-sm text-muted-foreground mb-8 text-center max-w-sm">Calculated deterministically based on projected burn rate vs active bank balance.</p>
            
            <div className="scale-125 mb-8 origin-center transition-all duration-500">
              <DTZGauge 
                daysToZero={baseDTZ} 
                warningLevel={liquidity.warning_level} 
              />
            </div>
            
            <div className={`w-full max-w-xs bg-muted/30 rounded-xl p-4 border border-border grid grid-cols-2 gap-4`}>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Current Forecast</span>
                <p className="font-black text-xl text-foreground mt-1">{baseDTZ === 999 ? '> 1 Year' : `${baseDTZ} Days`}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Burn Rate (Est)</span>
                <p className="font-black text-xl text-destructive mt-1">₹{Math.round((liquidity.obligations_due_7d/7)).toLocaleString()}<span className="text-xs text-muted-foreground">/day</span></p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-card to-card/50 rounded-3xl p-6 border border-border shadow-xl backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mt-10 -mr-10 pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-xl font-black flex items-center gap-2"><Brain className="text-primary"/> AI Action Center</h3>
              <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-md uppercase tracking-widest font-black shadow-sm">
                Ensemble: RF + GB
              </span>
            </div>
            
            <p className="text-xs text-muted-foreground mb-5 font-bold leading-relaxed relative z-10">
              Top predictive patterns driving the current baseline runway.
            </p>
            
            <div className="space-y-4 relative z-10">
              {mlData.predictions.slice(0, 3).map((pred) => (
                <div key={pred.receivable_id} className="group relative bg-background/40 hover:bg-background/80 transition-all border border-border/50 hover:border-primary/30 rounded-2xl p-4 shadow-sm hover:shadow-md cursor-default overflow-hidden">
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-extrabold text-foreground text-sm flex items-center gap-2">
                      {pred.payer}
                    </h4>
                    <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm ${pred.predicted_delay_days > 5 ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'}`}>
                      +{pred.predicted_delay_days} Days Late
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end mt-2">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-border"></span>
                      Due: {new Date(pred.original_date).toLocaleDateString()}
                    </div>
                    <div className="px-2 py-0.5 bg-muted rounded text-[10px] text-foreground font-black">
                      {Math.round(pred.adjusted_confidence * 100)}% Conf
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>

      {/* ─── Simulate Cases Sandbox ─── */}
      <div className="bg-card rounded-3xl p-8 border border-border shadow-lg">
          <div className="flex justify-between items-end mb-8">
             <div>
                <h3 className="text-3xl font-black flex items-center gap-3"><PlayCircle className="text-primary" size={32}/> Interactive Scenario Simulator</h3>
                <p className="text-muted-foreground font-medium mt-2 max-w-xl">Drag AI Optimizations and Pending Obligations into the active scenario bucket to observe compounding metric impacts before committing.</p>
             </div>
             
             {/* Score Readout */}
             {activeScenario.length > 0 && (
                 <div className="flex items-center gap-6 animate-fade-in bg-muted/40 px-6 py-4 rounded-2xl border border-border backdrop-blur-md">
                     <div className="text-center">
                         <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Simulated DTZ</span>
                         <span className={`text-2xl font-black ${simDTZDelta >= 0 ? 'text-success' : 'text-destructive'}`}>{finalDTZ} Days</span>
                     </div>
                     <div className="w-px h-10 bg-border"></div>
                     <div className="text-center">
                         <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Simulated Liquidity</span>
                         <span className={`text-2xl font-black ${simCashDelta >= 0 ? 'text-primary' : 'text-destructive'}`}>₹{finalCash.toLocaleString()}</span>
                     </div>
                 </div>
             )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               
               {/* SOURCE BUCKET */}
               <div className="lg:col-span-4 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                      <span className="font-extrabold text-foreground uppercase tracking-widest text-xs">Available Variables</span>
                      <span className="text-xs bg-muted text-muted-foreground font-bold px-2 py-0.5 rounded-full">{availableTokens.length}</span>
                  </div>
                  <div className="bg-muted/10 border-2 border-dashed border-border rounded-2xl p-4 flex-1 custom-scrollbar overflow-y-auto max-h-[500px]">
                      <div className="space-y-3 min-h-[100px]">
                          {availableTokens.map(token => (
                              <SelectableToken key={token.id} token={token} onAction={() => handleAddToken(token)} actionType="add" />
                          ))}
                          {availableTokens.length === 0 && <p className="text-center text-muted-foreground text-xs font-medium py-10 opacity-50">Empty Pool</p>}
                      </div>
                  </div>
               </div>

               {/* TRANSFER ARROW */}
               <div className="hidden lg:flex flex-col items-center justify-center opacity-30 px-2 lg:col-span-1">
                  <ArrowRight size={40} className="text-muted-foreground"/>
               </div>

               {/* TARGET BUCKET */}
               <div className="lg:col-span-7 flex flex-col h-full bg-primary/5 rounded-3xl border border-primary/20 p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                  
                  <div className="flex justify-between items-center mb-6 relative z-10">
                      <div>
                          <span className="font-black text-primary uppercase tracking-widest text-sm flex items-center gap-2"><Plus size={16}/> Active Simulation Area</span>
                          <span className="text-xs font-bold text-foreground/60 mt-0.5 block">Select variables to stage them here</span>
                      </div>
                      {activeScenario.length > 0 && <button className="bg-primary text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors"><Save size={14}/> Save Scenario</button>}
                  </div>

                  <div className="bg-background/60 border border-primary/20 rounded-2xl p-4 min-h-[150px] relative z-10 shadow-inner mb-6 space-y-3 custom-scrollbar overflow-y-auto max-h-[250px] transition-all">
                      {activeScenario.length === 0 ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50 z-0">
                              <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center mb-2"><BarChart3 className="text-primary/50" /></div>
                              <span className="text-sm font-bold text-primary/70">Awaiting Variables...</span>
                          </div>
                      ) : (
                          <div className="relative z-10 space-y-3">
                              {activeScenario.map(token => (
                                  <SelectableToken key={token.id} token={token} onAction={() => handleRemoveToken(token)} actionType="remove" />
                              ))}
                          </div>
                      )}
                  </div>

                  {/* Visual Impact Component rendered when active details exist */}
                  <div className={`transition-all duration-700 ease-out z-10 ${activeScenario.length > 0 ? 'opacity-100 translate-y-0 scale-100 max-h-[600px]' : 'opacity-0 translate-y-8 scale-95 max-h-0 overflow-hidden'}`}>
                      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-primary/20">
                          
                          {/* Live Recharts Delta Graph */}
                          <div className="h-56 bg-white/50 border border-border rounded-2xl p-4 shadow-sm backdrop-blur-md">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={graphData} maxBarSize={50} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#00BAF2" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                    <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                    <Bar yAxisId="left" dataKey="DTZ" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="Liquidity" fill="#00BAF2" radius={[4, 4, 0, 0]} />
                                </BarChart>
                             </ResponsiveContainer>
                          </div>

                          {/* AI Scenario Explainability Console */}
                          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                             <div className="flex justify-between items-center mb-4">
                               <span className="text-xs uppercase font-extrabold tracking-widest text-muted-foreground flex items-center gap-2"><Brain size={14}/> AI Assessment</span>
                               <span className={`text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider ${strategyScore > 75 ? 'bg-success/10 text-success' : strategyScore > 40 ? 'bg-yellow-500/10 text-yellow-600' : 'bg-destructive/10 text-destructive'}`}>
                                  Score: {strategyScore}/100
                               </span>
                             </div>
                             
                             <ul className="space-y-3">
                                {explainPoints.map((pt, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs font-medium text-foreground">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                                        <span className="leading-relaxed">{pt}</span>
                                    </li>
                                ))}
                             </ul>
                          </div>

                      </div>
                  </div>

               </div>
          </div>
      </div>

    </div>
  );
}

// Subcomponent for Selectable Item
function SelectableToken({ token, onAction, actionType }: { token: SimToken, onAction: () => void, actionType: 'add' | 'remove' }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md border-border transition-all">
            <button 
              onClick={onAction}
              className={`mt-1 p-1.5 rounded-md text-white shadow-sm hover:scale-105 active:scale-95 transition-all ${actionType === 'add' ? 'bg-primary hover:bg-primary/90' : 'bg-destructive hover:bg-destructive/90'}`}
              title={actionType === 'add' ? 'Add to Simulation' : 'Remove from Simulation'}
            >
               {actionType === 'add' ? <Plus size={14} strokeWidth={3}/> : <Minus size={14} strokeWidth={3}/>}
            </button>
            <div className="flex-1 w-full overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                   <h5 className="font-bold text-sm text-foreground flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis mr-2">{token.icon} {token.title}</h5>
                   <span className={`flex-shrink-0 text-[10px] font-black px-2 py-0.5 rounded ${token.dtzImpact > 0 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{token.dtzImpact > 0 ? `+${token.dtzImpact} DTZ` : 'Obj'}</span>
                </div>
                <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                    <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed whitespace-pre-wrap break-words">{token.description}</p>
                </div>
            </div>
        </div>
    );
}
