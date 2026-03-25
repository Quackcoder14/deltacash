"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { Triangle, ArrowRight, ShieldCheck, TrendingUp, Lock, User, Briefcase } from "lucide-react";

export function SplashLogin({ onLogin }: { onLogin: (user: string) => void }) {
  const [stage, setStage] = useState<"splash" | "auth">("splash");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  
  // Math Captcha
  const [captchaParams, setCaptchaParams] = useState({ a: 0, b: 0 });
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Generate initial captcha
    setCaptchaParams({
      a: Math.floor(Math.random() * 10) + 1,
      b: Math.floor(Math.random() * 10) + 1
    });

    // Splash timer
    const timer = setTimeout(() => {
      setStage("auth");
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setCaptchaError(false);
    
    // Verify Captcha
    if (parseInt(captchaInput) !== (captchaParams.a + captchaParams.b)) {
      setCaptchaError(true);
      // Regenerate on failure
      setCaptchaParams({
        a: Math.floor(Math.random() * 10) + 1,
        b: Math.floor(Math.random() * 10) + 1
      });
      setCaptchaInput("");
      return;
    }

    if (!username) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      onLogin(username);
    }, 600);
  };

  if (stage === "splash") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0"></div>
        
        <div className="z-10 flex flex-col items-center">
          <div className="splash-logo mb-6 bg-primary/10 p-6 rounded-3xl border border-primary/20 glow-primary">
            <Triangle size={80} className="text-primary fill-primary animate-pulse-slow rotate-180" />
          </div>
          <h1 className="text-5xl font-black tracking-tight text-foreground mb-2 splash-text">
            Delta<span className="text-primary">Cash</span>
          </h1>
          <p className="text-muted-foreground text-lg tracking-widest uppercase splash-tagline font-medium">
            True Liquidity Orchestration
          </p>
          
          <div className="w-48 h-1 bg-muted mt-12 rounded-full overflow-hidden">
            <div className="h-full bg-primary splash-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center relative overflow-hidden transition-opacity duration-500 bg-background ${isAnimating ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}>
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(to_bottom_left,#00BAF208_0%,transparent_50%)]"></div>
      </div>

      <div className="w-full max-w-md p-8 bg-card rounded-3xl shadow-xl z-10 animate-slide-up border border-border mx-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 gradient-primary"></div>
        
        <div className="flex items-center gap-3 mb-6 justify-center">
          <Triangle size={36} className="text-primary fill-primary rotate-180" />
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Delta<span className="text-primary">Cash</span></h2>
        </div>

        <div className="flex bg-muted p-1 rounded-xl mb-6">
          <button 
            type="button" 
            onClick={() => {setAuthMode("login"); setCaptchaError(false); setCaptchaInput("");}}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${authMode === "login" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`}
          >
            Login
          </button>
          <button 
            type="button" 
            onClick={() => {setAuthMode("signup"); setCaptchaError(false); setCaptchaInput("");}}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${authMode === "signup" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Username / ID</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Business Identity" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
                required
              />
              <User size={18} className="absolute right-4 top-3.5 text-muted-foreground/50" />
            </div>
          </div>

          {authMode === "signup" && (
            <div className="space-y-1.5 animate-slide-up">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Company Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="ACME Corp" 
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
                  required
                />
                <Briefcase size={18} className="absolute right-4 top-3.5 text-muted-foreground/50" />
              </div>
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Access Key</label>
            <div className="relative">
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
                required
              />
              <Lock size={18} className="absolute right-4 top-3.5 text-muted-foreground/50" />
            </div>
          </div>

          {/* Math Captcha */}
          <div className="p-4 bg-muted/50 rounded-xl border border-border flex items-center justify-between">
            <span className="font-mono text-lg font-bold text-foreground">
              {captchaParams.a} + {captchaParams.b} =
            </span>
            <input 
              type="number"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              placeholder="?"
              className={`w-20 text-center bg-background border ${captchaError ? 'border-destructive ring-1 ring-destructive' : 'border-border'} rounded-lg py-2 font-bold focus:outline-none focus:ring-2 focus:ring-primary`}
              required
            />
          </div>
          {captchaError && <p className="text-destructive text-xs font-bold text-center">Incorrect Captcha. Try again.</p>}

          <button 
            type="submit" 
            className="w-full gradient-primary hover:opacity-95 text-white font-bold rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 mt-2 transition-all shadow-md shadow-primary/20 group"
          >
            {authMode === "login" ? "Access Orchestrator" : "Create Account"}
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border flex justify-between text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-1"><ShieldCheck size={14} className="text-success"/> 256-bit Secure</div>
          <div className="flex items-center gap-1"><TrendingUp size={14} className="text-primary"/> ML Powered</div>
        </div>
      </div>
    </div>
  );
}
