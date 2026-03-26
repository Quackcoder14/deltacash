"use client";

import React, { useState, useEffect } from "react";
import { User, AppTab } from "@/types";
import { Home, SplitSquareHorizontal, FileInput, Calculator, Triangle } from "lucide-react";

// Import tabs
import { HomeTab } from "./tabs/HomeTab";
import { TimelineTab } from "./tabs/TimelineTab";
import { InputTab } from "./tabs/InputTab";
import { CalculatorTab } from "./tabs/CalculatorTab";

export function DashboardLayout({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Navigation Bar - Light Theme */}
      <header className="border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-xl border border-primary/20">
              <Triangle size={24} className="text-primary fill-primary" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Delta<span className="text-primary">Cash</span>
            </h1>
          </div>

          <nav className="hidden md:flex flex-1 justify-center">
            <div className="flex bg-muted/60 p-1 rounded-xl border border-border">
              {(
                [
                  { id: "home", label: "Dashboard", icon: Home },
                  { id: "timeline", label: "Timeline", icon: SplitSquareHorizontal },
                  { id: "input", label: "Input", icon: FileInput },
                  { id: "calculator", label: "Calculator", icon: Calculator },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AppTab)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-white text-primary shadow-sm scale-100"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/50 active:scale-95"
                  }`}
                >
                  <tab.icon size={18} className={activeTab === tab.id ? "" : "opacity-70"} />
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-foreground">{user.username}</p>
              <p className="text-xs text-muted-foreground font-medium">{user.company}</p>
            </div>
            <div className="w-10 h-10 rounded-full gradient-primary shadow-sm flex items-center justify-center text-white font-bold cursor-pointer hover:opacity-90 transition-opacity">
              {user.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-8 relative overflow-x-hidden">
        <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
          {activeTab === "home" && <HomeTab />}
          {activeTab === "timeline" && <TimelineTab />}
          {activeTab === "input" && <InputTab />}
          {activeTab === "calculator" && <CalculatorTab />}
        </div>
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-xl z-50 p-2 pb-safe">
        <div className="flex justify-around items-center">
          {(
            [
              { id: "home", label: "Home", icon: Home },
              { id: "timeline", label: "Timeline", icon: SplitSquareHorizontal },
              { id: "input", label: "Input", icon: FileInput },
              { id: "calculator", label: "Calc", icon: Calculator },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AppTab)}
              className={`flex flex-col items-center gap-1 p-2 w-16 transition-all ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`p-1.5 rounded-full transition-all ${activeTab === tab.id ? 'bg-primary/10' : ''}`}>
                <tab.icon size={20} className={activeTab === tab.id ? "fill-primary/20" : ""} />
              </div>
              <span className="text-[10px] font-bold">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
