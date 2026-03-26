"use client";

import React from "react";
import { PrioritizedObligation, NegotiationEmail } from "@/types";
import { Brain, FileText, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionCenterProps {
  actions: PrioritizedObligation[];
  emails: NegotiationEmail[];
}

export function ActionCenter({ actions, emails }: ActionCenterProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-extrabold flex items-center gap-2 text-foreground">
            <Brain className="text-primary" size={20} />
            AI Action Center
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Autonomous orchestrator insights</p>
        </div>
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
        {actions.map((act, i) => (
          <div key={`act_${i}`} className="group relative bg-muted/20 border border-border rounded-xl transition-all hover:bg-card hover:border-primary/30 hover:shadow-md cursor-pointer overflow-hidden flex flex-col">
            
            <div className="p-4 z-10 relative bg-transparent border-b border-border/50">
               <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                     <span className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors">{act.obligation.vendor}</span>
                     <span className="text-[10px] text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
                        <Brain size={10} className="text-primary"/> Auto-Strategy Active
                     </span>
                  </div>
                  <span className={cn(
                  "text-[10px] font-extrabold uppercase px-3 py-1 rounded-full",
                  act.suggested_delay_days > 0 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "bg-muted text-muted-foreground border border-border"
                  )}>
                  {act.recommended_action.replace(/_/g, ' ')} {act.suggested_delay_days > 0 && `(+${act.suggested_delay_days}d)`}
                  </span>
               </div>
               
               {/* Reasoning is now always visible */}
               <div className="mt-3 bg-primary/5 rounded-lg p-3 border border-primary/10">
                   <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                     <span className="font-bold text-primary mr-1">AI Insight:</span>
                     {act.reasoning}
                   </p>
               </div>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2 my-4">
            <div className="h-px bg-border flex-1"></div>
            <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Drafted Comm</h4>
            <div className="h-px bg-border flex-1"></div>
        </div>

        {emails.map((email, i) => (
          <div key={`mail_${i}`} className="group bg-card border border-border rounded-xl hover:border-primary/50 cursor-pointer transition-all shadow-sm overflow-hidden relative">
            <div className="p-3 flex gap-3 items-center">
              <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <FileText size={18} />
              </div>
              <div className="flex-1">
                <span className="text-xs font-extrabold text-foreground block">To: {email.vendor}</span>
                <span className="text-[10px] uppercase font-bold text-yellow-600 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 mt-1 inline-block">{email.tone}</span>
              </div>
              <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all"/>
            </div>

            <div className="max-h-0 opacity-0 group-hover:max-h-24 group-hover:opacity-100 transition-all duration-300 ease-in-out bg-muted/30 px-3 pb-3 border-t border-border/0 group-hover:border-border overflow-hidden">
                <p className="text-[10px] font-medium text-muted-foreground line-clamp-3 italic mt-2">"{email.subject}"</p>
                <button className="w-full mt-2 py-1 text-[10px] font-bold text-primary bg-primary/10 rounded border border-primary/20 hover:bg-primary/20 transition-colors uppercase tracking-wider">Review & Send Draft</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
