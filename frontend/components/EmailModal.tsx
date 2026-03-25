"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: string;
  subject: string;
  body: string;
  reasoning: string;
  tone: string;
}

export function EmailModal({ isOpen, onClose, vendor, subject, body, reasoning, tone }: EmailModalProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-card rounded-xl shadow-2xl z-50 p-6 animate-in zoom-in-95 duration-200 border border-border">
          <div className="flex justify-between items-center mb-4">
            <div>
              <Dialog.Title className="text-xl font-bold text-foreground">
                Negotiation Flip: {vendor}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-semibold">
                  {tone}
                </span>
                Agent Reasoning: {reasoning}
              </Dialog.Description>
            </div>
            <Dialog.Close className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full">
              <X size={20} />
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-md border border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</span>
              <p className="font-medium text-foreground mt-1">{subject}</p>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-md border border-border whitespace-pre-wrap font-sans text-sm text-foreground">
              {body}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors border border-transparent"
            >
              Cancel
            </button>
            <button
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all",
                copied ? "bg-success hover:bg-success/90" : "bg-primary hover:bg-primary/90"
              )}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy to Clipboard"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
