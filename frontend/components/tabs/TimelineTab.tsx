"use client";

import React, { useState, useEffect } from "react";
import { fetchTransactions, fetchObligations } from "@/lib/api";
import { Transaction, Obligation } from "@/types";
import { Building2, Calendar as CalIcon, CreditCard } from "lucide-react";

export function TimelineTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDetails, setHoveredDetails] = useState<any | null>(null);

  const loadData = async () => {
    try {
      const [txns, obs] = await Promise.all([
        fetchTransactions(20),
        fetchObligations()
      ]);
      setTransactions(txns.transactions.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setObligations(obs.obligations.filter(o => o.status === "pending").sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm h-[800px] flex flex-col items-center justify-center relative overflow-hidden animate-in slide-in-from-right-4 duration-500">
      
      <div className="absolute top-8 left-8">
        <h2 className="text-2xl font-black text-foreground">Liquidity Horizon</h2>
        <p className="text-sm text-muted-foreground font-medium">Interactive horizontal projection of past & future cashflows.</p>
      </div>

      <div className="w-full h-96 relative flex items-center overflow-x-auto overflow-y-visible custom-scrollbar px-20">
        
        {/* The Central Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-border rounded-full -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-[50%] right-0 h-1 bg-gradient-to-r from-primary/50 to-primary/10 rounded-full -translate-y-1/2"></div>

        <div className="flex items-center min-w-max h-full relative z-10 mx-auto justify-center px-[30vw]">
          
          {/* Past Transactions (Left) */}
          <div className="flex items-center justify-end pr-8 gap-8">
            {transactions.map((tx) => (
              <div 
                key={`tx_${tx.id}`} 
                className="relative group cursor-crosshair"
                onMouseEnter={() => setHoveredDetails({ type: 'past', data: tx })}
                onMouseLeave={() => setHoveredDetails(null)}
              >
                <div className={`w-4 h-4 rounded-full border-4 border-card transition-transform duration-300 ${hoveredDetails?.data?.id === tx.id ? 'scale-150 bg-success' : 'bg-muted-foreground'}`}></div>
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground font-bold whitespace-nowrap opacity-50">{new Date(tx.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
              </div>
            ))}
          </div>

          {/* TODAY MARKER (Center) */}
          <div className="relative mx-8">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary/20 animate-ping"></div>
            <div className="w-6 h-6 rounded-full bg-primary border-4 border-card z-20 shadow-[0_0_15px_rgba(0,186,242,0.8)] flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-black uppercase px-3 py-1 rounded-full shadow-lg">Today</div>
          </div>

          {/* Future Obligations (Right) */}
          <div className="flex items-center justify-start pl-8 gap-12">
            {obligations.map((ob) => (
              <div 
                key={`ob_${ob.id}`} 
                className="relative group cursor-crosshair"
                onMouseEnter={() => setHoveredDetails({ type: 'future', data: ob })}
                onMouseLeave={() => setHoveredDetails(null)}
              >
                <div className={`w-5 h-5 rounded-full border-4 border-card transition-all duration-300 ${
                  hoveredDetails?.data?.id === ob.id ? 'scale-150 shadow-lg z-30 ' + (ob.relationship === 'Critical' ? 'bg-destructive shadow-destructive/50' : ob.relationship === 'Important' ? 'bg-yellow-500 shadow-yellow-500/50' : 'bg-primary shadow-primary/50')
                  : ob.relationship === 'Critical' ? 'bg-destructive' : ob.relationship === 'Important' ? 'bg-yellow-500' : 'bg-primary'
                }`}></div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-foreground font-bold whitespace-nowrap">{new Date(ob.due_date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Floating Hover Details Card */}
      <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 w-80 bg-card rounded-2xl shadow-2xl border border-border p-5 pointer-events-none transition-all duration-300 ease-out transform ${hoveredDetails ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
        {hoveredDetails && (
          <div>
            <div className={`absolute top-0 left-0 w-full h-1.5 ${hoveredDetails.type === 'past' ? 'bg-success' : hoveredDetails.data.relationship === 'Critical' ? 'bg-destructive' : hoveredDetails.data.relationship === 'Important' ? 'bg-yellow-500' : 'bg-primary'}`}></div>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-xl ${hoveredDetails.type === 'past' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                {hoveredDetails.type === 'past' ? <CreditCard size={20}/> : <Building2 size={20}/>}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{hoveredDetails.type === 'past' ? 'Settled Transaction' : 'Upcoming Obligation'}</span>
                <h4 className="font-bold text-lg text-foreground truncate w-48">{hoveredDetails.type === 'past' ? hoveredDetails.data.description : hoveredDetails.data.vendor}</h4>
              </div>
            </div>
            
            <div className="space-y-2 text-sm font-medium">
              <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg border border-border">
                <span className="text-muted-foreground">Amount</span>
                <span className={`font-black ${hoveredDetails.type === 'past' && hoveredDetails.data.amount > 0 ? 'text-success' : 'text-foreground'}`}>₹{Math.abs(hoveredDetails.data.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg border border-border">
                <span className="text-muted-foreground">Date</span>
                <span className="text-foreground flex items-center gap-1"><CalIcon size={14}/> {new Date(hoveredDetails.type === 'past' ? hoveredDetails.data.date : hoveredDetails.data.due_date).toLocaleDateString()}</span>
              </div>
              {hoveredDetails.type === 'future' && (
                <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg border border-border">
                  <span className="text-muted-foreground">Category</span>
                  <span className="text-foreground">{hoveredDetails.data.category}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
