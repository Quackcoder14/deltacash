"use client";

import React from "react";
import { PrioritizedObligation, NegotiationEmail } from "@/types";
import { Brain, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionCenterProps {
  actions: PrioritizedObligation[];
  emails: NegotiationEmail[];
}

export function ActionCenter({ actions, emails }: ActionCenterProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-extrabold flex items-center gap-2 text-foreground">
            <Brain className="text-primary" size={20} />
            AI Action Center
          </h3>
          <p className="text-xs text-muted-foreground">Autonomous orchestrator recommendations</p>
        </div>
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
        {actions.map((act, i) => (
          <div key={i} className="p-3 bg-muted/30 border border-border rounded-xl">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-sm text-foreground">{act.obligation.vendor}</span>
              <span className={cn(
                "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md",
                act.suggested_delay_days > 0 ? "bg-primary/20 text-primary border border-primary/30" : "bg-destructive/20 text-destructive border border-destructive/30"
              )}>
                {act.recommended_action} {act.suggested_delay_days > 0 && `(+${act.suggested_delay_days}d)`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              <span className="font-bold text-foreground">Reasoning: </span> {act.reasoning}
            </p>
          </div>
        ))}

        <div className="h-px bg-border my-2"></div>
        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 px-1">Drafted Communications</h4>

        {emails.map((email, i) => (
          <div key={i} className="p-3 bg-card border border-border rounded-xl hover:border-primary/50 cursor-pointer transition-colors shadow-sm">
            <div className="flex gap-2 items-start">
              <FileText className="text-primary mt-1" size={16} />
              <div>
                <span className="text-xs font-extrabold text-foreground mb-1 block">To: {email.vendor}</span>
                <p className="text-xs font-medium text-muted-foreground line-clamp-2">{email.subject}</p>
                <div className="mt-2 flex gap-2">
                  <span className="text-[9px] uppercase font-bold text-yellow-600 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">{email.tone}</span>
                  <span className="text-[9px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">Ready to Send</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
