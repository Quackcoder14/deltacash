"use client";

import React, { useState } from "react";
import { DailyProjection } from "@/types";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

interface LiquidityGraphProps {
  data: DailyProjection[];
}

export function LiquidityGraph({ data }: LiquidityGraphProps) {
  const [activeMetric, setActiveMetric] = useState<'available' | 'tax' | 'expenditure'>('available');

  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Available: d.available,
    Committed: d.committed,
    Taxed: d.cumulative_inflow * 0.20, // Proxy for tax graph
    Expenditure: d.cumulative_outflow
  }));

  const metricsInfo = {
    available: { key: 'Available', color: '#00BAF2', gradient: 'url(#colorAvailable)' },
    tax: { key: 'Taxed', color: '#F59E0B', gradient: 'url(#colorTax)' },
    expenditure: { key: 'Expenditure', color: '#E53E3E', gradient: 'url(#colorExp)' }
  };

  const current = metricsInfo[activeMetric];

  return (
    <div className="w-full h-full flex flex-col">
       <div className="flex gap-2 mb-4 justify-end absolute top-0 right-4 z-10">
          <button onClick={() => setActiveMetric('available')} className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${activeMetric === 'available' ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-muted-foreground'}`}>Liquidity</button>
          <button onClick={() => setActiveMetric('tax')} className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${activeMetric === 'tax' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-600' : 'bg-background border-border text-muted-foreground'}`}>Tax</button>
          <button onClick={() => setActiveMetric('expenditure')} className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${activeMetric === 'expenditure' ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-background border-border text-muted-foreground'}`}>Expenditure</button>
       </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAvailable" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00BAF2" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#00BAF2" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorTax" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#E53E3E" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#E53E3E" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
            itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
            formatter={(value: number) => [`₹${value.toLocaleString()}`, current.key]}
          />
          <Area type="monotone" dataKey={current.key} stroke={current.color} strokeWidth={3} fillOpacity={1} fill={current.gradient} animationDuration={1000} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
