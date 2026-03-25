"use client";

import React, { useState, useEffect, useRef } from "react";
import { fetchTransactions, fetchObligations } from "@/lib/api";
import { Transaction, Obligation } from "@/types";
import { Building2, Calendar as CalIcon, CreditCard } from "lucide-react";

export function TimelineTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDetails, setHoveredDetails] = useState<any | null>(null);

  // Auto-center and dynamic lighting state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const centerMarkerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const loadData = async () => {
    try {
      const [txns, obs] = await Promise.all([
        fetchTransactions(30),
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

  // Auto-center on load
  useEffect(() => {
    if (!loading && scrollContainerRef.current && centerMarkerRef.current) {
        // Calculate offset to perfectly center the today marker
        const containerWidth = scrollContainerRef.current.clientWidth;
        const markerOffset = centerMarkerRef.current.offsetLeft;
        const scrollTarget = markerOffset - (containerWidth / 2) + 16;
        
        // Timeout ensures rendering has measured bounding box accurately
        setTimeout(() => {
            scrollContainerRef.current?.scrollTo({ left: scrollTarget, behavior: 'smooth' });
        }, 100);
    }
  }, [loading, transactions, obligations]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
    // Track bounded position for the glow effect
    setMousePos({ x, y: 0 });
  };

  return (
    <div className="bg-card rounded-3xl border border-border p-6 shadow-sm h-[800px] flex flex-col items-center justify-center relative overflow-hidden animate-in slide-in-from-right-4 duration-500">
      
      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <h2 className="text-3xl font-black text-foreground">Liquidity Horizon</h2>
        <p className="text-sm text-muted-foreground font-medium mt-1">Interactive continuous timeline mapping cashflows dynamically.</p>
      </div>

      <div 
        className="w-full h-[600px] relative flex items-center overflow-x-auto overflow-y-hidden custom-scrollbar px-20 cursor-move"
        ref={scrollContainerRef}
        onMouseMove={handleMouseMove}
      >
        
        {/* Dynamic Glowing Track */}
        <div className="absolute top-[60%] left-0 right-0 h-1.5 bg-muted rounded-full -translate-y-1/2 overflow-hidden shadow-inner">
           {/* Sub-track indicating future projection coloring */}
           <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/10"></div>
           
           {/* Dynamic Mouse Cursor Lighting */}
           <div 
             className="absolute top-0 h-full w-[300px] bg-gradient-to-r from-transparent via-primary to-transparent -translate-y-0 opacity-70 blur-[2px] pointer-events-none transition-transform duration-75 ease-linear"
             style={{ transform: `translateX(${mousePos.x - 150}px)` }}
           ></div>
        </div>

        <div className="flex items-center min-w-[3000px] h-full relative z-10 mx-auto justify-center pt-24">
          
          {/* Past Transactions (Left) */}
          <div className="flex items-center justify-end pr-8 gap-12 w-1/2">
            {transactions.map((tx) => (
              <div 
                key={`tx_${tx.id}`} 
                className="relative group cursor-crosshair flex flex-col items-center pb-20 hover:-translate-y-2 transition-transform duration-300"
                onMouseEnter={() => setHoveredDetails({ type: 'past', data: tx })}
                onMouseLeave={() => setHoveredDetails(null)}
              >
                {/* Node is ABOVE the line */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-px h-16 bg-muted-foreground/30 z-0"></div>
                <div className={`w-5 h-5 rounded-full border-4 border-card transition-all duration-300 relative z-20 ${hoveredDetails?.data?.id === tx.id ? 'scale-150 bg-success shadow-[0_0_15px_rgba(0,185,114,0.6)]' : 'bg-muted-foreground hover:bg-success hover:scale-125 hover:shadow-lg'}`}></div>
                
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-background border border-border px-3 py-1 rounded-xl text-[10px] text-muted-foreground font-black tracking-widest uppercase whitespace-nowrap shadow-sm">
                   {new Date(tx.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                </div>
              </div>
            ))}
          </div>

          {/* TODAY MARKER (Center) */}
          <div className="relative mx-12 flex flex-col items-center pb-20 z-30" ref={centerMarkerRef}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-primary/20 animate-ping pointer-events-none"></div>
            <div className="w-8 h-8 rounded-full bg-primary border-4 border-card z-20 shadow-[0_0_20px_rgba(0,186,242,0.8)] flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
             <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-2xl">Today</div>
             {/* Reticle anchor line down to track */}
             <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-16 bg-primary opacity-50"></div>
          </div>

          {/* Future Obligations (Right) */}
          <div className="flex items-center justify-start pl-8 gap-16 w-1/2">
            {obligations.map((ob) => (
              <div 
                key={`ob_${ob.id}`} 
                className="relative group cursor-crosshair flex flex-col items-center pb-20 hover:-translate-y-2 transition-transform duration-300"
                onMouseEnter={() => setHoveredDetails({ type: 'future', data: ob })}
                onMouseLeave={() => setHoveredDetails(null)}
              >
                <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-0.5 h-16 opacity-30 z-0 ${ob.relationship === 'Critical' ? 'bg-destructive' : ob.relationship === 'Important' ? 'bg-yellow-500' : 'bg-primary'}`}></div>
                
                <div className={`w-6 h-6 rounded-full border-[5px] border-card transition-all duration-300 relative z-20 ${
                  hoveredDetails?.data?.id === ob.id ? 'scale-150 shadow-2xl z-30 ' + (ob.relationship === 'Critical' ? 'bg-destructive shadow-destructive/60' : ob.relationship === 'Important' ? 'bg-yellow-500 shadow-yellow-500/60' : 'bg-primary shadow-primary/60')
                  : ob.relationship === 'Critical' ? 'bg-destructive shadow-sm' : ob.relationship === 'Important' ? 'bg-yellow-500 shadow-sm' : 'bg-primary shadow-sm hover:scale-125'
                }`}></div>
                
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-card border border-border px-3 py-1 rounded-xl text-[10px] text-foreground font-black tracking-widest uppercase whitespace-nowrap shadow-sm group-hover:border-primary/50 transition-colors">
                   {new Date(ob.due_date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Floating Hover Details Card (Sticky Bottom Center) */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-96 bg-card rounded-3xl shadow-2xl border border-border/50 p-6 pointer-events-none transition-all duration-400 cubic-bezier(0.4, 0, 0.2, 1) transform ${hoveredDetails ? 'opacity-100 translate-y-0 scale-100 backdrop-blur-xl' : 'opacity-0 translate-y-12 scale-90'}`}>
        {hoveredDetails && (
          <div>
            <div className={`absolute top-0 left-0 w-full h-1.5 rounded-t-3xl ${hoveredDetails.type === 'past' ? 'bg-success' : hoveredDetails.data.relationship === 'Critical' ? 'bg-destructive' : hoveredDetails.data.relationship === 'Important' ? 'bg-yellow-500' : 'bg-primary'}`}></div>
            <div className="flex items-center gap-4 mb-5">
              <div className={`p-3 rounded-2xl ${hoveredDetails.type === 'past' ? 'bg-success/10 text-success border border-success/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                {hoveredDetails.type === 'past' ? <CreditCard size={24}/> : <Building2 size={24}/>}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{hoveredDetails.type === 'past' ? 'Settled Transaction' : 'Upcoming Priority Obligation'}</span>
                <h4 className="font-extrabold text-xl text-foreground truncate w-56">{hoveredDetails.type === 'past' ? hoveredDetails.data.description : hoveredDetails.data.vendor}</h4>
              </div>
            </div>
            
            <div className="space-y-3 text-sm font-medium">
              <div className="flex justify-between items-center bg-muted/20 p-3 rounded-xl border border-border/50">
                <span className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Computed Size</span>
                <span className={`font-black text-lg ${hoveredDetails.type === 'past' && hoveredDetails.data.amount > 0 ? 'text-success' : 'text-foreground'}`}>₹{Math.abs(hoveredDetails.data.amount).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-muted/20 p-3 rounded-xl border border-border/50">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block mb-1">Due Date</span>
                    <span className="text-foreground font-bold flex items-center gap-1"><CalIcon size={14} className="text-primary"/> {new Date(hoveredDetails.type === 'past' ? hoveredDetails.data.date : hoveredDetails.data.due_date).toLocaleDateString()}</span>
                 </div>
                 {hoveredDetails.type === 'future' && (
                  <div className="bg-muted/20 p-3 rounded-xl border border-border/50">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block mb-1">Ledger Category</span>
                    <span className="text-foreground font-bold truncate block">{hoveredDetails.data.category}</span>
                  </div>
                 )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
