"use client";

import React, { useState, useRef } from "react";
import { Upload, X, FileText, Loader2, AlertCircle } from "lucide-react";
import { OCRResult } from "@/types";

interface OCRUploadProps {
  onUploadSuccess: (result: OCRResult) => void;
}

export function OCRUpload({ onUploadSuccess }: OCRUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simple mock delay to simulate actual slow OCR processing visually
      await new Promise(resolve => setTimeout(resolve, 800));

      const res = await fetch("http://localhost:8000/upload/", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      
      const data: OCRResult = await res.json();
      onUploadSuccess(data);
    } catch (err) {
      console.error(err);
      setError("Failed to process file. Make sure backend is running on :8000");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm mb-6 animate-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <FileText size={18} className="text-primary"/>
          Quick Ingestion (OCR)
        </h3>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-destructive/10 text-destructive rounded-lg flex items-start gap-2 text-sm text-left">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50"
        } ${loading ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onChange} 
          className="hidden" 
          accept="image/png, image/jpeg, application/pdf, text/plain"
        />
        
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Running EasyOCR Engine...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="bg-muted p-3 rounded-full text-muted-foreground">
              <Upload size={24} />
            </div>
            <div>
              <p className="font-medium text-foreground">Drag & Drop invoice here</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF or TXT</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
