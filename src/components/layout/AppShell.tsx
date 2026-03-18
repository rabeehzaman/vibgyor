"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { AppProvider } from "@/context/AppContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isCustomerRoute = pathname.startsWith("/customer");

  return (
    <AppProvider>
      {isCustomerRoute ? (
        <div className="flex min-h-screen flex-col bg-background">
          <CustomerHeader />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      ) : (
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} />
            <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
          </div>
        </div>
      )}
    </AppProvider>
  );
}
