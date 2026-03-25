"use client";

import React, { useState } from "react";
import { SplashLogin } from "@/components/SplashLogin";
import { DashboardLayout } from "@/components/DashboardLayout";

export default function AppRouter() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{username: string, company: string} | null>(null);

  const handleLogin = (username: string) => {
    setUser({ username, company: `${username} Enterprises` });
    setIsAuthenticated(true);
  };

  if (!isAuthenticated || !user) {
    return <SplashLogin onLogin={handleLogin} />;
  }

  return <DashboardLayout user={user} />;
}
