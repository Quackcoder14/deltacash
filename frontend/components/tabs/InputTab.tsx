"use client";

import React, { useState, useEffect, useRef } from "react";
import { Upload, Mic, FileText, CheckCircle2, ArrowRight, Loader2, RefreshCcw, AlertCircle, Calendar as CalIcon } from "lucide-react";
import { addObligation, uploadFile } from "@/lib/api";
import { OCRResult } from "@/types";

export function InputTab() {
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [added, setAdded] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);

  const parseAndSetResult = (rawText: string, source: string) => {
      // Very basic regex heuristics to pull amount and a probable vendor
      const text = rawText.toLowerCase();
      
      // Amount regex: looks for rupee symbol or generic numbers often accompanied by thousand/k
      const amtMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+k?)/i);
      let extractedTotal = 0;
      if (amtMatch && amtMatch[1]) {
         let numStr = amtMatch[1].replace(/,/g, '');
         if (numStr.endsWith('k')) {
            extractedTotal = parseFloat(numStr.replace('k', '')) * 1000;
         } else {
            extractedTotal = parseFloat(numStr);
         }
      }

      // Vendor heuristic: first capitalized word block or specific keywords
      let vendor = source === "Voice Recording" ? "Unknown Vendor" : "Extracted Receipt Entity";
      const words = rawText.split(' ').filter(w => w.length > 2);
      if (words.length > 0) {
          // just pick a probable block for demo, skipping common stop words
          const stopwords = ['the','and','payment','pay','to','for','due','amount','receive','invoice','bill'];
          const possibleVendors = words.filter(w => !stopwords.includes(w.toLowerCase()));
          if (possibleVendors.length > 0) {
              vendor = possibleVendors.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          }
      }

      setOcrResult({
        vendor: vendor,
        total: extractedTotal > 0 ? extractedTotal : Math.floor(Math.random() * 50000) + 1000, 
        date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        confidence: source === "Voice Recording" ? 0.95 : 0.78,
        raw_text: rawText,
        duplicate_match: null,
        is_duplicate: false,
        extraction_method: source
      });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    setAdded(false);
    setErrorMsg("");
    
    try {
      const file = e.target.files[0];
      // Send physical file buffer to Python True Backend to run EasyOCR model
      const result = await uploadFile(file);
      
      if (result) {
         setOcrResult(result);
      } else {
         setErrorMsg("Backend returned null OCR Output.");
      }
      
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to extract text from image.");
    } finally {
      setUploading(false);
    }
  };

  const toggleVoice = async () => {
    setAdded(false);
    setErrorMsg("");
    if (listening && recorder) {
       recorder.stop();
       setListening(false);
    } else {
       try {
           const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
           const newRecorder = new MediaRecorder(stream);
           
           const audioChunks: Blob[] = [];
           newRecorder.ondataavailable = e => {
               if (e.data.size > 0) audioChunks.push(e.data);
           };
           
           newRecorder.onstop = async () => {
               const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
               stream.getTracks().forEach(track => track.stop());
               setVoiceText("Sending to Whisper API...");
               setOcrResult(null);
               setUploading(true);
               
               try {
                  const formData = new FormData();
                  formData.append('file', audioBlob, 'voicenote.webm');
                  
                  const res = await fetch("http://127.0.0.1:8000/api/upload/audio", {
                     method: 'POST',
                     body: formData
                  });
                  if (res.ok) {
                      const data = await res.json();
                      setOcrResult(data);
                      setVoiceText(data.raw_text || "Transcription Complete");
                  } else {
                      setVoiceText("Whisper backend failed.");
                  }
               } catch(err) {
                  setVoiceText("Upload error.");
               } finally {
                  setUploading(false);
               }
           };
           
           newRecorder.start();
           setRecorder(newRecorder);
           setListening(true);
           setVoiceText("Recording... Tap again to stop.");
       } catch (err) {
           setErrorMsg("Microphone permission denied.");
       }
    }
  };

  const confirmAndAdd = async () => {
    if (!ocrResult || !ocrResult.vendor || !ocrResult.total) return;
    
    const due = ocrResult.date ? new Date(ocrResult.date) : new Date(Date.now() + 15 * 86400000);

    try {
      await addObligation({
        vendor: ocrResult.vendor,
        amount: ocrResult.total,
        due_date: due.toISOString().split("T")[0],
        relationship: "Important",
        penalty_rate: 0.02,
        urgency: 5,
        category: "Real-Time Ingestion"
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
        
        {errorMsg && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex items-center gap-3">
                <AlertCircle size={20}/>
                <p className="font-bold text-sm tracking-wide">{errorMsg}</p>
            </div>
        )}

        <div className="bg-card rounded-3xl border border-border p-8 shadow-sm">
          <div className="text-center max-w-lg mx-auto mb-10">
            <h2 className="text-3xl font-black text-foreground mb-4">Real Ingestion Engine</h2>
            <p className="text-muted-foreground font-medium">Capture reality. Client-side Tesseract.js extracts physical invoices, while Native Browser WebSpeech parses dictation blocks seamlessly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="group flex flex-col items-center justify-center p-10 border-2 border-dashed border-border rounded-2xl hover:border-primary hover:bg-primary/5 cursor-pointer transition-all">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                {uploading ? <Loader2 className="text-primary animate-spin" size={32}/> : <Upload className="text-primary" size={32} />}
              </div>
              <span className="text-lg font-bold text-foreground mb-1">Upload Physical Invoice</span>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest text-center mt-2 px-4 py-1.5 bg-muted rounded-full">Powered by Tesseract OCR</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
            </label>

            <button onClick={toggleVoice} className="group flex flex-col items-center justify-center p-10 border-2 border-dashed border-border rounded-2xl hover:border-success hover:bg-success/5 transition-all text-center">
               <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all shadow-sm ${listening ? 'bg-success/20 animate-pulse scale-110 shadow-[0_0_20px_rgba(0,185,114,0.4)]' : 'bg-success/10 group-hover:scale-110'}`}>
                 <Mic className={listening ? "text-success animate-bounce" : "text-success"} size={32} />
               </div>
               <span className="text-lg font-bold text-foreground mb-2">Dictation Console</span>
               <span className={`text-xs font-medium px-4 py-2 min-h-[40px] rounded-lg transition-colors flex items-center justify-center w-full max-w-[200px] leading-relaxed ${listening ? 'bg-success/10 text-success border border-success/20 shadow-inner' : 'bg-muted/50 text-muted-foreground'}`}>
                   {voiceText || 'Tap to grant microphone access'}
               </span>
            </button>
          </div>
        </div>

        {/* Extraction Results Module */}
        {ocrResult && (
          <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-2xl animate-scale-in">
            <div className="bg-muted/40 px-6 py-4 border-b border-border flex justify-between items-center backdrop-blur-md">
              <h3 className="font-extrabold text-foreground flex items-center gap-2 tracking-tight"><FileText size={20} className="text-primary"/> Captured Telemetry</h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-success bg-success/10 px-3 py-1.5 rounded-full border border-success/20 shadow-sm">AI Confidence: {(ocrResult.confidence * 100).toFixed(1)}%</span>
            </div>
            
            <div className="p-6">
              
              <div className="mb-6 p-4 bg-background border border-border/50 rounded-xl">
                 <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest block mb-2">Raw Processor Output</span>
                 <p className="text-xs font-mono text-muted-foreground line-clamp-3 leading-relaxed opacity-70">
                     {voiceText || "Processed..."}
                 </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="p-5 bg-background border border-border rounded-2xl shadow-sm">
                   <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block mb-1">Identified Entity</span>
                   <p className="text-xl font-bold text-foreground">{ocrResult.vendor || "Unknown"}</p>
                 </div>
                 <div className="p-5 bg-background border border-border rounded-2xl shadow-sm">
                   <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block mb-1">Financial Weight</span>
                   <p className="text-2xl font-black text-foreground">₹{ocrResult.total?.toLocaleString() || "0"}</p>
                 </div>
                 <div className="p-5 bg-background border border-border rounded-2xl shadow-sm">
                   <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block mb-1">Forecast Date</span>
                   <p className="text-lg font-bold text-foreground flex items-center gap-2"><CalIcon size={16} className="text-primary"/> {ocrResult.date || "Not Found"}</p>
                 </div>
                 <div className="p-5 bg-background border border-border rounded-2xl shadow-sm">
                   <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block mb-1">State Classification</span>
                   <p className="text-sm font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-lg inline-block border border-primary/20 mt-1">Liability Escrow</p>
                 </div>
              </div>

              {ocrResult.is_duplicate && (
                 <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-600 p-4 rounded-xl mb-6 flex items-start gap-3 animate-fade-in font-medium shadow-sm">
                     <AlertCircle size={20} className="mt-0.5 flex-shrink-0"/>
                     <div>
                         <p className="font-bold">Duplicate Invoice Prevented</p>
                         <p className="text-[11px] mt-1 opacity-90 leading-relaxed uppercase tracking-widest font-black">Our deduplication engine flagged this entry ({ocrResult.duplicate_match}). It appears to be already present in your ledger. Double-counting has been safely blocked.</p>
                     </div>
                 </div>
              )}

              {added ? (
                <div className="w-full py-5 bg-success/10 text-success font-black rounded-2xl border border-success/30 flex items-center justify-center gap-3 animate-fade-in shadow-inner text-lg">
                  <CheckCircle2 size={24}/> Instantiated in Global State Array
                </div>
              ) : (
                <div className="flex gap-4">
                  <button onClick={() => {setOcrResult(null); setVoiceText("");}} className="px-6 py-4 font-black tracking-widest text-muted-foreground uppercase hover:bg-muted rounded-2xl transition-colors flex items-center gap-2 border border-transparent hover:border-border">
                    <RefreshCcw size={18}/> Discard
                  </button>
                  <button onClick={confirmAndAdd} disabled={ocrResult.is_duplicate} className={`flex-1 text-lg py-4 rounded-2xl flex items-center justify-center gap-3 transition-all ${ocrResult.is_duplicate ? 'bg-muted text-muted-foreground cursor-not-allowed font-black uppercase tracking-widest opacity-50' : 'gradient-primary text-white font-black hover:opacity-95 shadow-xl shadow-primary/20 group hover:scale-[1.01]'}`}>
                    {ocrResult.is_duplicate ? "Blocked (Duplicate)" : "Inject Validated Data"} <ArrowRight size={20} className={!ocrResult.is_duplicate ? "group-hover:translate-x-1 transition-transform" : ""}/>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

     </div>
  );
}
