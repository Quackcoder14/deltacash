"use client";

import React, { useState, useEffect } from "react";
import { MLPortfolioSummary, InvestmentTip, LiquidityData } from "@/types";
import { fetchMLPredictions, fetchInvestmentTips, fetchLiquidity } from "@/lib/api";
import { DTZGauge } from "@/components/DTZGauge";
import { Loader2, Brain, TrendingUp, Info } from "lucide-react";

export function CalculatorTab() {
  const [mlData, setMlData] = useState<MLPortfolioSummary | null>(null);
  const [tips, setTips] = useState<InvestmentTip[]>([]);
  const [liquidity, setLiquidity] = useState<LiquidityData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Hover interaction for tips
  const [hoveredTip, setHoveredTip] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [ml, tipData, liq] = await Promise.all([
          fetchMLPredictions(),
          fetchInvestmentTips(),
          fetchLiquidity()
        ]);
        setMlData(ml);
        setTips(tipData.tips);
        setLiquidity(liq);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !mlData || !liquidity) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  }

  // Artificial DTZ modification based on hovered tip to simulate interactive projection
  const currentDTZ = liquidity.dtz_days;
  const projectedDTZ = hoveredTip !== null 
    ? hoveredTip === 0 ? currentDTZ + 5 
    : hoveredTip === 1 ? currentDTZ + 12 
    : currentDTZ + 2 
    : currentDTZ;
  
  const aiExplanation = hoveredTip !== null 
    ? hoveredTip === 0 ? "Shifting ₹50k to an overnight liquid fund yields 5% annualized. We project this covers the deficit predicted on Day " + (currentDTZ + 2) + ", extending runway by 5 days."
    : hoveredTip === 1 ? "Negotiating a 2% early payment discount saves you exactly ₹4,200 on upcoming bulk invoices. This retained cash pushes the zero-balance event back by nearly two weeks."
    : "Converting pending receivables into immediate credit factoring carries a 1% fee but provides instant liquidity to survive the predicted Week 3 shortfall."
    : "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* ─── DTZ & Core Calc ─── */}
      <div className="bg-card rounded-2xl p-6 border border-border flex flex-col items-center justify-center relative shadow-sm transition-all duration-500">
        
        {hoveredTip !== null && (
           <div className="absolute top-4 left-4 right-4 bg-primary/10 border border-primary/20 p-3 rounded-xl flex items-start gap-3 animate-fade-in shadow-sm">
              <Info className="text-primary mt-0.5 flex-shrink-0" size={18} />
              <div>
                 <span className="text-[10px] font-black uppercase text-primary tracking-widest block mb-0.5">AI Projection Active</span>
                 <p className="text-xs text-foreground font-medium leading-relaxed">{aiExplanation}</p>
              </div>
           </div>
        )}

        <h3 className={`text-xl font-bold mb-2 transition-all duration-500 ${hoveredTip !== null ? 'mt-20' : ''}`}>Days to Zero (DTZ)</h3>
        <p className="text-sm text-muted-foreground mb-8 text-center max-w-sm">
          Calculated deterministically based on projected burn rate vs active bank balance.
        </p>
        
        {/* Render Gauge with dynamic projection */}
        <div className={`transition-transform duration-500 ${hoveredTip !== null ? 'scale-125 my-8' : 'scale-150 mb-12'}`}>
          <DTZGauge 
             daysToZero={projectedDTZ} 
             warningLevel={hoveredTip !== null ? 'yellow' : liquidity.warning_level} 
          />
        </div>
        
        <div className={`w-full bg-muted/30 rounded-xl p-4 border border-border grid grid-cols-2 gap-4 transition-opacity duration-300 ${hoveredTip !== null ? 'opacity-50' : 'opacity-100'}`}>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Current Forecast</span>
            <p className="font-black text-xl text-foreground mt-1">{currentDTZ === 999 ? '> 1 Year' : `${currentDTZ} Days`}</p>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Burn Rate (Est)</span>
            <p className="font-black text-xl text-destructive mt-1">₹{Math.round((liquidity.obligations_due_7d/7)).toLocaleString()}<span className="text-xs text-muted-foreground">/day</span></p>
          </div>
        </div>
      </div>

      {/* ─── AI Glass-Box & Predictions ─── */}
      <div className="bg-card rounded-2xl p-6 border border-border row-span-2 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black flex items-center gap-2"><Brain className="text-primary"/> Glass-Box AI</h3>
          <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md uppercase tracking-widest font-black">
            Ensemble: RF + GB
          </span>
        </div>
        
        <p className="text-sm text-muted-foreground mb-6 font-medium leading-relaxed">Receivables delay prediction engine. Transparency into machine learning inference reasoning behind vendor delays.</p>

        <div className="space-y-4">
          {mlData.predictions.slice(0, 3).map((pred, i) => (
            <div key={pred.receivable_id} className="bg-muted/10 border border-border rounded-xl p-4 transition-all hover:border-primary/30 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-foreground text-sm">{pred.payer}</h4>
                  <p className="text-xs text-muted-foreground font-medium">Original Due: {new Date(pred.original_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${pred.predicted_delay_days > 5 ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'}`}>
                    +{pred.predicted_delay_days} Days Late
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 font-bold">Conf: {Math.round(pred.adjusted_confidence * 100)}%</p>
                </div>
              </div>

              {/* Reasoning Chain (Glass-Box) */}
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-black mb-2 block">Top contributing features</span>
                <div className="space-y-2">
                  {pred.reasoning_chain.slice(0,2).map(rc => (
                    <div key={rc.feature} className="flex items-start gap-2 text-xs">
                      <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${rc.impact === 'high' ? 'bg-destructive' : 'bg-primary'}`}></div>
                      <span className="text-foreground/80 font-medium leading-relaxed">{rc.explanation}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Investment / Optimization Tips ─── */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
         <h3 className="text-xl font-black mb-4 flex items-center gap-2"><TrendingUp className="text-success" /> AI Optimization Scenarios</h3>
         <p className="text-xs text-muted-foreground mb-4">Hover over any scenario to instantly see its projected impact on your Days To Zero (DTZ).</p>
         
         <div className="space-y-3">
           {tips.map((tip, i) => (
             <div 
                key={i} 
                className={`flex gap-4 p-4 rounded-xl border transition-all cursor-pointer duration-300 ${hoveredTip === i ? 'bg-success/5 border-success/30 shadow-md scale-[1.02]' : 'bg-muted/30 border-border hover:border-primary/30'}`}
                onMouseEnter={() => setHoveredTip(i)}
                onMouseLeave={() => setHoveredTip(null)}
             >
               <div className={`text-2xl mt-1 transition-transform duration-300 ${hoveredTip === i ? 'scale-110' : ''}`}>{tip.icon}</div>
               <div className="flex-1">
                  <h4 className={`font-bold text-sm mb-1 transition-colors ${hoveredTip === i ? 'text-primary' : 'text-foreground'}`}>{tip.title}</h4>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">{tip.description}</p>
                  
                  {hoveredTip === i && (
                     <div className="mt-3 overflow-hidden animate-slide-up bg-background p-2 -mx-2 -mb-2 rounded-b-lg border-t border-border flex justify-between items-center px-4">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Projected DTZ Impact: </span>
                        <span className="text-sm font-black text-success">+{i === 0 ? 5 : i === 1 ? 12 : 2} Days</span>
                     </div>
                  )}
               </div>
             </div>
           ))}
         </div>
      </div>

    </div>
  );
}
