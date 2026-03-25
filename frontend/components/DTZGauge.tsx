"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface DTZGaugeProps {
  daysToZero: number | null;
  warningLevel: "green" | "yellow" | "red";
  className?: string;
}

export function DTZGauge({ daysToZero, warningLevel, className }: DTZGaugeProps) {
  const radius = 90;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  // Max scale to 30 days for visual representation
  const maxDays = 30;
  const displayDays = daysToZero === null ? maxDays : Math.min(daysToZero, maxDays);
  
  // Calculate percentage of remaining days (green = full circle, red = close to 0)
  const percent = displayDays / maxDays;
  const strokeDashoffset = circumference - percent * circumference;

  const colorClasses = {
    green: "stroke-success text-success",
    yellow: "stroke-yellow-500 text-yellow-500",
    red: "stroke-destructive text-destructive",
  };

  const currentColors = colorClasses[warningLevel] || colorClasses.green;

  return (
    <div className={cn("relative flex items-center justify-center p-4", className)}>
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90 transition-all duration-1000 ease-in-out"
      >
        <circle
          stroke="hsl(var(--muted))"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          className={cn("transition-all duration-1000 ease-in-out drop-shadow-md", currentColors.split(' ')[0])}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset }}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center animate-in zoom-in duration-500">
        <span className={cn("text-5xl font-extrabold tracking-tight", currentColors.split(' ')[1])}>
          {daysToZero === null ? "∞" : daysToZero}
        </span>
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">
          Days to Zero
        </span>
      </div>
    </div>
  );
}
