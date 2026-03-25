"use client";

import React, { useState } from "react";
import { Upload, Mic, FileText, CheckCircle2, ArrowRight, Loader2, RefreshCcw } from "lucide-react";
import { uploadFile, addObligation } from "@/lib/api";
import { OCRResult } from "@/types";

export function InputTab() {
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [added, setAdded] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    setAdded(false);
    try {
      const result = await uploadFile(e.target.files[0]);
      setOcrResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const simulateVoiceExtraction = () => {
    setAdded(false);
    setListening(true);
    setVoiceText("Listening...");
    setTimeout(() => {
      setVoiceText("Add payment to TechCorp Server Providers for ₹45,000 due next week");
      setTimeout(() => {
        setListening(false);
        setOcrResult({
          text: "Add payment to TechCorp Server Providers for ₹45,000 due next week",
          vendor: "TechCorp Providers",
          total: 45000,
          date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          confidence: 0.94
        });
      }, 1500);
    }, 2000);
  };

  const confirmAndAdd = async () => {
    if (!ocrResult || !ocrResult.vendor || !ocrResult.total) return;
    
    // Default due date to +15 days or use extracted
    const due = ocrResult.date ? new Date(ocrResult.date) : new Date(Date.now() + 15 * 86400000);

    try {
      await addObligation({
        vendor: ocrResult.vendor,
        amount: ocrResult.total,
        due_date: due.toISOString().split("T")[0],
        relationship: "Important",
        penalty_rate: 0.02,
        urgency: 5,
        category: "Extracted Invoice"
      });
      setAdded(true);
      setTimeout(() => {
        setAdded(false);
        setOcrResult(null);
        setVoiceText("");
      }, 3000);
    } catch (e) {
      console.error("Failed to add from OCR/Voice", e);
    }
  };

  return (
     <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        
        <div className="bg-card rounded-3xl border border-border p-8 shadow-sm">
          <div className="text-center max-w-lg mx-auto mb-10">
            <h2 className="text-3xl font-black text-foreground mb-4">Smart Ingestion</h2>
            <p className="text-muted-foreground font-medium">Upload physical bills extending the limits of OCR, or use voice commands to instantly funnel liabilities into the global tracking state.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="group flex flex-col items-center justify-center p-10 border-2 border-dashed border-border rounded-2xl hover:border-primary hover:bg-primary/5 cursor-pointer transition-all">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {uploading ? <Loader2 className="text-primary animate-spin" size={32}/> : <Upload className="text-primary" size={32} />}
              </div>
              <span className="text-lg font-bold text-foreground mb-1">Upload Invoice</span>
              <span className="text-xs text-muted-foreground font-medium">PDF, JPG, PNG up to 10MB</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} disabled={uploading} />
            </label>

            <button onClick={simulateVoiceExtraction} disabled={listening} className="group flex flex-col items-center justify-center p-10 border-2 border-dashed border-border rounded-2xl hover:border-success hover:bg-success/5 transition-all text-center">
               <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform ${listening ? 'bg-success/20 animate-pulse' : 'bg-success/10 group-hover:scale-110'}`}>
                 <Mic className={listening ? "text-success animate-bounce" : "text-success"} size={32} />
               </div>
               <span className="text-lg font-bold text-foreground mb-1">Voice Command</span>
               <span className="text-xs text-muted-foreground font-medium min-h-[16px]">{voiceText || 'Deploy NLP Extractor'}</span>
            </button>
          </div>
        </div>

        {/* Extraction Results Module */}
        {ocrResult && (
          <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-xl animate-scale-in">
            <div className="bg-muted px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-black text-foreground flex items-center gap-2"><FileText size={18} className="text-primary"/> Extracted Variables</h3>
              <span className="text-xs font-bold uppercase tracking-wider text-success bg-success/10 px-3 py-1 rounded-full border border-success/20">Confidence: {(ocrResult.confidence * 100).toFixed(1)}%</span>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="p-4 bg-background border border-border rounded-xl">
                   <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block mb-1">Entity / Vendor</span>
                   <p className="text-xl font-bold text-foreground">{ocrResult.vendor || "Unknown"}</p>
                 </div>
                 <div className="p-4 bg-background border border-border rounded-xl">
                   <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block mb-1">Amount Due</span>
                   <p className="text-xl font-black text-foreground">₹{ocrResult.total?.toLocaleString() || "0"}</p>
                 </div>
                 <div className="p-4 bg-background border border-border rounded-xl">
                   <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block mb-1">Extracted Date</span>
                   <p className="text-lg font-bold text-foreground">{ocrResult.date || "Not Found"}</p>
                 </div>
                 <div className="p-4 bg-background border border-border rounded-xl">
                   <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block mb-1">Classification</span>
                   <p className="text-lg font-bold text-primary">Liability Payables</p>
                 </div>
              </div>

              {added ? (
                <div className="w-full py-4 bg-success/10 text-success font-black rounded-xl border border-success/30 flex items-center justify-center gap-2 animate-fade-in shadow-inner">
                  <CheckCircle2 size={24}/> Injected into Global Timeline & State
                </div>
              ) : (
                <div className="flex gap-4">
                  <button onClick={() => {setOcrResult(null); setVoiceText("");}} className="px-6 py-4 font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors flex items-center gap-2">
                    <RefreshCcw size={18}/> Discard
                  </button>
                  <button onClick={confirmAndAdd} className="flex-1 gradient-primary text-white font-black py-4 rounded-xl hover:opacity-90 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group transition-all">
                    Confirm & Inject to State <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

     </div>
  );
}
