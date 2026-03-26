"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, Mic, PenLine, FileText, CheckCircle2, ArrowRight,
  Loader2, RefreshCcw, AlertCircle, Calendar as CalIcon,
  StopCircle, File, ImageIcon, X, ChevronDown, ChevronUp,
  Sparkles, Zap, Volume2
} from "lucide-react";
import { addObligation, uploadFile, parseText } from "@/lib/api";
import { OCRResult } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type InputMode = "upload" | "voice" | "manual";

interface ManualForm {
  vendor: string;
  amount: string;
  date: string;
  category: string;
  notes: string;
  relationship: "Critical" | "Important" | "Flexible";
  urgency: number;
}

const CATEGORIES = [
  "Raw Materials", "Logistics", "Payroll", "Utilities", "Rent",
  "Services", "Tax & Compliance", "Marketing", "Technology", "Other"
];

// ─── ResultCard Component ─────────────────────────────────────────────────────

function ResultCard({
  result,
  onDiscard,
  onAdd,
  added,
  manualOverride,
  onOverride,
}: {
  result: OCRResult;
  onDiscard: () => void;
  onAdd: () => void;
  added: boolean;
  manualOverride?: Partial<ManualForm>;
  onOverride?: (f: Partial<ManualForm>) => void;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVendor, setEditVendor] = useState(result.vendor || "");
  const [editAmount, setEditAmount] = useState(String(result.total || ""));
  const [editDate, setEditDate] = useState(result.date || "");

  const confidence = result.confidence ?? 0;
  const confColor =
    confidence >= 0.7 ? "text-green-400 bg-green-400/10 border-green-400/20" :
    confidence >= 0.4 ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" :
    "text-red-400 bg-red-400/10 border-red-400/20";

  const methodLabel: Record<string, string> = {
    easyocr: "EasyOCR",
    pytesseract: "Tesseract OCR",
    pdfplumber: "PDF Text Layer",
    "pdfplumber+pytesseract": "PDF + OCR",
    text_input: "Voice / Text",
    manual_text: "Manual Text",
    text_decode: "Raw Decode",
    regex_fallback: "Regex Fallback",
  };

  return (
    <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-400">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-transparent to-transparent px-6 py-4 border-b border-border flex justify-between items-center">
        <h3 className="font-extrabold text-foreground flex items-center gap-2 tracking-tight">
          <Sparkles size={18} className="text-primary" />
          Extracted Intelligence
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {methodLabel[result.extraction_method] ?? result.extraction_method}
          </span>
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${confColor}`}>
            {(confidence * 100).toFixed(0)}% confidence
          </span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Key fields grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Vendor */}
          <div className="col-span-2 p-5 bg-background border border-border rounded-2xl shadow-sm relative group">
            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest block mb-1">Vendor / Entity</span>
            {editing ? (
              <input
                className="w-full text-xl font-bold text-foreground bg-transparent border-b border-primary/50 outline-none pb-0.5"
                value={editVendor}
                onChange={e => setEditVendor(e.target.value)}
                placeholder="Vendor name..."
              />
            ) : (
              <p className="text-xl font-bold text-foreground">{result.vendor || "⚠ Not detected"}</p>
            )}
            {!result.vendor && (
              <p className="text-[10px] text-destructive mt-1">Try uploading a clearer image or adding manually</p>
            )}
          </div>

          {/* Amount */}
          <div className="p-5 bg-background border border-border rounded-2xl shadow-sm">
            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest block mb-1">Amount</span>
            {editing ? (
              <input
                className="w-full text-2xl font-black text-foreground bg-transparent border-b border-primary/50 outline-none pb-0.5"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                placeholder="0"
                type="number"
              />
            ) : (
              <p className="text-2xl font-black text-foreground">
                {result.total ? `₹${result.total.toLocaleString("en-IN")}` : "⚠ Not found"}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="p-5 bg-background border border-border rounded-2xl shadow-sm">
            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest block mb-1">Due Date</span>
            {editing ? (
              <input
                className="w-full text-lg font-bold text-foreground bg-transparent border-b border-primary/50 outline-none pb-0.5"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                type="date"
              />
            ) : (
              <p className="text-lg font-bold text-foreground flex items-center gap-2">
                <CalIcon size={15} className="text-primary" />
                {result.date || "Not detected"}
              </p>
            )}
          </div>
        </div>

        {/* Raw text toggle */}
        {result.raw_text && (
          <div className="border border-border/40 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowRaw(r => !r)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/60 transition-colors text-muted-foreground text-xs font-bold uppercase tracking-widest"
            >
              <span>Raw Extracted Text</span>
              {showRaw ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showRaw && (
              <div className="px-4 py-3 bg-background">
                <p className="text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap opacity-80 max-h-32 overflow-y-auto">
                  {result.raw_text}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Duplicate warning */}
        {result.is_duplicate && (
          <div className="bg-yellow-500/10 border border-yellow-500/40 text-yellow-600 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Duplicate Invoice Detected</p>
              <p className="text-[11px] mt-1 opacity-80 leading-relaxed">
                Our deduplication engine matched this entry against: <strong>{result.duplicate_match}</strong>.
                Double-counting has been blocked to protect your ledger integrity.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        {added ? (
          <div className="w-full py-5 bg-green-500/10 text-green-400 font-black rounded-2xl border border-green-500/30 flex items-center justify-center gap-3 text-lg animate-in fade-in duration-300">
            <CheckCircle2 size={22} /> Added to Timeline Successfully
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={onDiscard}
              className="px-5 py-3.5 font-bold text-sm tracking-wide text-muted-foreground hover:bg-muted rounded-2xl transition-colors flex items-center gap-2 border border-transparent hover:border-border"
            >
              <X size={16} /> Discard
            </button>
            {editing ? (
              <button
                onClick={() => {
                  if (onOverride) {
                    onOverride({ vendor: editVendor, amount: editAmount, date: editDate });
                  }
                  setEditing(false);
                }}
                className="px-5 py-3.5 font-bold text-sm tracking-wide text-primary hover:bg-primary/10 rounded-2xl transition-colors border border-primary/30"
              >
                Save Edits
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-5 py-3.5 font-bold text-sm tracking-wide text-primary hover:bg-primary/10 rounded-2xl transition-colors border border-primary/30"
              >
                <PenLine size={14} className="inline mr-1.5" />Edit
              </button>
            )}
            <button
              onClick={onAdd}
              disabled={result.is_duplicate}
              className={`flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-base ${
                result.is_duplicate
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-40"
                  : "bg-gradient-to-r from-primary to-primary/80 text-white hover:opacity-95 shadow-xl shadow-primary/20 hover:scale-[1.01] group"
              }`}
            >
              {result.is_duplicate ? "Blocked — Duplicate" : "Add to Timeline"}
              {!result.is_duplicate && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FileUploadZone Component ─────────────────────────────────────────────────

function FileUploadZone({ onResult, disabled }: { onResult: (r: OCRResult) => void; disabled: boolean }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setError("");
    setUploading(true);

    // Show preview
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPreviewName(null);
    } else {
      setPreviewUrl(null);
      setPreviewName(file.name);
    }

    try {
      const result = await uploadFile(file);
      onResult(result);
    } catch (e) {
      setError("Extraction failed. Check that the backend is running.");
      console.error(e);
    } finally {
      setUploading(false);
    }
  }, [onResult]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 min-h-[260px] ${
          dragOver
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "border-border hover:border-primary/60 hover:bg-primary/5"
        } ${disabled || uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="text-primary animate-spin" size={36} />
            </div>
            <div className="text-center">
              <p className="font-bold text-foreground">Extracting data...</p>
              <p className="text-xs text-muted-foreground mt-1">Running OCR & entity detection</p>
            </div>
          </div>
        ) : previewUrl ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="preview" className="max-h-36 max-w-full rounded-xl object-contain shadow-md border border-border" />
            <p className="text-xs text-muted-foreground">Click to change file</p>
          </div>
        ) : previewName ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center">
              <File className="text-red-400" size={32} />
            </div>
            <p className="font-bold text-foreground text-sm">{previewName}</p>
            <p className="text-xs text-muted-foreground">Click to change file</p>
          </div>
        ) : (
          <>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 transition-transform duration-300 ${dragOver ? "scale-125 bg-primary/20" : "bg-primary/10"}`}>
              <Upload className="text-primary" size={36} />
            </div>
            <p className="text-lg font-black text-foreground mb-2">Drop your file here</p>
            <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
              Supports JPG, PNG, PDF, WEBP invoices & receipts.<br />
              Vendor, amount & date extracted automatically.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                Tesseract OCR
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                pdfplumber
              </span>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf,.pdf"
          onChange={onInputChange}
          disabled={uploading || disabled}
        />
      </div>
    </div>
  );
}

// ─── VoiceInputZone Component ─────────────────────────────────────────────────

// SpeechRecognition is a browser API not fully typed in older TS DOM libs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

function VoiceInputZone({ onResult, disabled }: { onResult: (r: OCRResult) => void; disabled: boolean }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<AnySpeechRecognition>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) {
      setSupported(false);
    }
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const startListening = useCallback(() => {
    setError("");
    setTranscript("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) {
      setError("Web Speech API not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new Rec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let full = "";
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript + " ";
      }
      setTranscript(full.trim());
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (e: any) => {
      setError(`Microphone error: ${e.error}. Ensure browser has permission.`);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }, []);

  const stopAndProcess = useCallback(async () => {
    recognitionRef.current?.stop();
    setListening(false);

    if (!transcript.trim()) {
      setError("No speech detected. Try again.");
      return;
    }

    setProcessing(true);
    try {
      const result = await parseText(transcript);
      onResult(result);
    } catch (e) {
      setError("Backend extraction failed. Ensure the backend is running.");
      console.error(e);
    } finally {
      setProcessing(false);
    }
  }, [transcript, onResult]);

  const words = transcript.split(" ").filter(Boolean);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl flex items-start gap-2 text-sm">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />{error}
        </div>
      )}

      {!supported && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 p-4 rounded-xl text-sm font-medium">
          ⚠ Web Speech API not supported. Use Chrome or Edge for voice input.
        </div>
      )}

      <div className={`relative flex flex-col items-center justify-center p-10 border-2 rounded-3xl transition-all duration-300 min-h-[260px] ${
        listening
          ? "border-green-500 bg-green-500/5 shadow-[0_0_30px_-8px_rgba(0,200,100,0.3)]"
          : "border-border hover:border-green-500/40"
      }`}>
        {processing ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="text-primary animate-spin" size={36} />
            </div>
            <p className="font-bold text-foreground">Extracting entities...</p>
            <p className="text-xs text-muted-foreground">Sending transcript to NLP engine</p>
          </div>
        ) : (
          <>
            {/* Mic button */}
            <button
              onClick={listening ? stopAndProcess : startListening}
              disabled={!supported || disabled}
              className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-300 shadow-xl ${
                listening
                  ? "bg-green-500 hover:bg-red-500 animate-pulse scale-110 shadow-green-500/30"
                  : "bg-primary/10 hover:bg-primary/20 hover:scale-105 shadow-primary/20"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {listening
                ? <StopCircle className="text-white" size={36} />
                : <Mic className="text-primary" size={36} />
              }
            </button>

            <p className="font-black text-foreground text-base mb-1">
              {listening ? "Listening... tap to stop" : "Tap to speak"}
            </p>
            <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
              {listening
                ? "Say something like: \"Pay fifty thousand to Acme Corp for raw materials due April 20th\""
                : "Describe the payment — vendor, amount, due date. Real-time Web Speech API."}
            </p>

            {/* Transcript display */}
            {transcript && (
              <div className="mt-5 w-full max-w-md bg-background border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 size={12} className="text-green-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Live Transcript</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed font-medium">
                  {words.map((word, i) => (
                    <span
                      key={i}
                      className="inline-block mr-1 animate-in fade-in duration-200"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      {word}
                    </span>
                  ))}
                  {listening && <span className="inline-block w-0.5 h-4 bg-green-400 ml-0.5 animate-pulse" />}
                </p>
                {!listening && (
                  <button
                    onClick={stopAndProcess}
                    disabled={processing}
                    className="mt-3 w-full py-2.5 rounded-xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Zap size={15} /> Extract Entities from Transcript
                  </button>
                )}
              </div>
            )}

            {/* Tech badge */}
            {!transcript && (
              <div className="mt-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
                  Web Speech API (Real-time)
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── ManualEntryZone Component ────────────────────────────────────────────────

function ManualEntryZone({ onResult, disabled }: { onResult: (r: OCRResult) => void; disabled: boolean }) {
  const [form, setForm] = useState<ManualForm>({
    vendor: "", amount: "", date: "", category: "Other",
    notes: "", relationship: "Important", urgency: 5,
  });
  const [errors, setErrors] = useState<Partial<ManualForm>>({});

  const set = (key: keyof ManualForm, val: string | number) =>
    setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e: Partial<ManualForm> = {};
    if (!form.vendor.trim()) e.vendor = "Required";
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) e.amount = "Valid amount required";
    if (!form.date) e.date = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const result: OCRResult = {
      vendor: form.vendor.trim(),
      total: parseFloat(form.amount),
      date: form.date,
      raw_text: `Manual entry: ${form.vendor} | ₹${form.amount} | ${form.date}${form.notes ? ` | ${form.notes}` : ""}`,
      confidence: 1.0,
      duplicate_match: null,
      is_duplicate: false,
      extraction_method: "manual_entry",
    };
    onResult(result);
  };

  const inputClass = (err?: string) =>
    `w-full bg-background border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors text-sm font-medium ${
      err ? "border-destructive/60" : "border-border"
    }`;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vendor */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Vendor / Payee Name *
          </label>
          <input
            className={inputClass(errors.vendor)}
            placeholder="e.g. Tata Steel Ltd, Amazon Web Services..."
            value={form.vendor}
            onChange={e => set("vendor", e.target.value)}
          />
          {errors.vendor && <p className="text-destructive text-xs">{errors.vendor}</p>}
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Amount (₹) *
          </label>
          <input
            className={inputClass(errors.amount)}
            placeholder="e.g. 45000"
            type="number"
            min="0"
            value={form.amount}
            onChange={e => set("amount", e.target.value)}
          />
          {errors.amount && <p className="text-destructive text-xs">{errors.amount}</p>}
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Due Date *
          </label>
          <input
            className={inputClass(errors.date)}
            type="date"
            value={form.date}
            onChange={e => set("date", e.target.value)}
          />
          {errors.date && <p className="text-destructive text-xs">{errors.date}</p>}
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Category
          </label>
          <select
            className={inputClass()}
            value={form.category}
            onChange={e => set("category", e.target.value)}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Relationship */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Vendor Relationship
          </label>
          <div className="flex gap-2">
            {(["Critical", "Important", "Flexible"] as const).map(r => (
              <button
                key={r}
                onClick={() => set("relationship", r)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                  form.relationship === r
                    ? r === "Critical"
                      ? "bg-red-500/10 border-red-500/40 text-red-400"
                      : r === "Important"
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-green-500/10 border-green-500/40 text-green-400"
                    : "border-border text-muted-foreground hover:border-border/80"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Urgency */}
        <div className="md:col-span-2 space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Urgency Level
            </label>
            <span className="text-sm font-black text-primary">{form.urgency}/10</span>
          </div>
          <input
            type="range" min={1} max={10} step={1}
            value={form.urgency}
            onChange={e => set("urgency", parseInt(e.target.value))}
            className="w-full accent-primary h-2 rounded-full"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground uppercase tracking-widest">
            <span>Low</span><span>Medium</span><span>High</span>
          </div>
        </div>

        {/* Notes */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Notes (optional)
          </label>
          <textarea
            className={`${inputClass()} resize-none h-20`}
            placeholder="e.g. Invoice #INV-2024-0312, monthly retainer..."
            value={form.notes}
            onChange={e => set("notes", e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={submit}
        disabled={disabled}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-white font-black text-base flex items-center justify-center gap-3 hover:opacity-95 shadow-xl shadow-primary/20 hover:scale-[1.005] transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
      >
        <PenLine size={18} /> Create Entry & Preview
        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}

// ─── Main InputTab ────────────────────────────────────────────────────────────

export function InputTab() {
  const [mode, setMode] = useState<InputMode>("upload");
  const [result, setResult] = useState<OCRResult | null>(null);
  const [added, setAdded] = useState(false);
  const [overrides, setOverrides] = useState<Partial<ManualForm>>({});

  const handleResult = (r: OCRResult) => {
    setResult(r);
    setAdded(false);
    setOverrides({});
    // Scroll to result
    setTimeout(() => {
      document.getElementById("result-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleDiscard = () => {
    setResult(null);
    setAdded(false);
    setOverrides({});
  };

  const handleAdd = async () => {
    if (!result) return;
    const vendor = overrides.vendor ?? result.vendor ?? "Unknown";
    const amount = overrides.amount ? parseFloat(overrides.amount) : (result.total ?? 0);
    const dueStr = overrides.date ?? result.date ?? new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0];

    try {
      await addObligation({
        vendor,
        amount,
        due_date: dueStr,
        relationship: "Important",
        penalty_rate: 0.02,
        urgency: 5,
        category: "Ingested",
      });
      setAdded(true);
      setTimeout(() => {
        setResult(null);
        setAdded(false);
        setOverrides({});
      }, 3000);
    } catch (e) {
      console.error("Failed to add obligation", e);
    }
  };

  // Merge overrides into result for display
  const displayResult = result
    ? {
        ...result,
        vendor: overrides.vendor !== undefined ? overrides.vendor : result.vendor,
        total: overrides.amount !== undefined ? parseFloat(overrides.amount) : result.total,
        date: overrides.date !== undefined ? overrides.date : result.date,
      }
    : null;

  const MODES: { id: InputMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: "upload", label: "Upload File", icon: <Upload size={18} />, desc: "JPG, PNG, PDF, WEBP" },
    { id: "voice",  label: "Voice Input", icon: <Mic size={18} />,    desc: "Web Speech API" },
    { id: "manual", label: "Manual Entry", icon: <PenLine size={18} />, desc: "Type it in" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-black text-foreground mb-3">Real Ingestion Engine</h2>
        <p className="text-muted-foreground font-medium max-w-lg mx-auto leading-relaxed">
          Upload invoices & receipts for AI extraction, dictate payments via voice,
          or manually enter transaction details — then add to your timeline.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-3">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); handleDiscard(); }}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
              mode === m.id
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/10 scale-[1.01]"
                : "border-border hover:border-primary/40 hover:bg-muted/40"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === m.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
              {m.icon}
            </div>
            <span className={`text-sm font-black tracking-tight ${mode === m.id ? "text-primary" : "text-foreground"}`}>
              {m.label}
            </span>
            <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Active Panel */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
        {mode === "upload" && (
          <FileUploadZone onResult={handleResult} disabled={added} />
        )}
        {mode === "voice" && (
          <VoiceInputZone onResult={handleResult} disabled={added} />
        )}
        {mode === "manual" && (
          <ManualEntryZone onResult={handleResult} disabled={added} />
        )}
      </div>

      {/* Result Card */}
      {displayResult && (
        <div id="result-card">
          <ResultCard
            result={displayResult}
            onDiscard={handleDiscard}
            onAdd={handleAdd}
            added={added}
            onOverride={setOverrides}
          />
        </div>
      )}
    </div>
  );
}
