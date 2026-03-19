"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { AppProvider } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "vibgyor-sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isCustomerRoute = pathname.startsWith("/customer");

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSED_KEY, String(!prev));
      return !prev;
    });
  };

  return (
    <AppProvider>
      {isCustomerRoute ? (
        <div className="flex min-h-screen flex-col bg-background">
          <CustomerHeader />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      ) : (
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={collapsed}
            onToggleCollapse={handleToggleCollapse}
          />
          <div
            className={cn(
              "flex flex-1 flex-col overflow-hidden transition-all duration-300"
            )}
          >
            <Header onMenuClick={() => setSidebarOpen(true)} />
            <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
          </div>
        </div>
      )}
    </AppProvider>
  );
}
