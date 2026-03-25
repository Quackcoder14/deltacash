"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface StressTestButtonProps {
  onTrigger: () => Promise<void>;
  isActive: boolean;
}

export function StressTestButton({ onTrigger, isActive }: StressTestButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await onTrigger();
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-6">
      <div className="flex gap-3">
        <div className="bg-red-500/20 p-2 rounded-lg text-red-500">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h3 className="font-bold text-red-600 dark:text-red-400">Stress Test Mode</h3>
          <p className="text-sm text-red-600/80 dark:text-red-400/80">
            Simulate 30-day delay on all incoming receivables to view shock impact.
          </p>
        </div>
      </div>
      <button
        onClick={handleClick}
        disabled={loading || isActive}
        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {isActive ? "Test Active" : "Run Stress Test"}
      </button>
    </div>
  );
}
