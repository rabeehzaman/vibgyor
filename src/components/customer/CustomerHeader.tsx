"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, LogIn, LayoutDashboard, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { Button } from "@/components/ui/button";

export function CustomerHeader() {
  const pathname = usePathname();
  const { customer, logout } = useCustomerAuth();

  const navLink = (href: string, label: string, icon: React.ReactNode) => (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        pathname === href
          ? "bg-white/20 text-white backdrop-blur-sm"
          : "text-white/80 hover:bg-white/10 hover:text-white"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-[oklch(0.40_0.22_265)] to-[oklch(0.50_0.20_290)] shadow-lg">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href={customer ? "/customer" : "/customer/login"} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white text-sm font-bold backdrop-blur-sm">
            V
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">VIBGYOR</span>
            <span className="ml-1.5 text-xs text-white/70">Customer Services</span>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {customer ? (
            <>
              {navLink("/customer", "Dashboard", <LayoutDashboard className="h-4 w-4" />)}
              {navLink("/customer/track", "Track", <Search className="h-4 w-4" />)}
              <div className="ml-2 flex items-center gap-2 border-l border-white/20 pl-3">
                <span className="hidden sm:flex items-center gap-1 text-sm text-white/80">
                  <User className="h-3.5 w-3.5" />
                  {customer.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="h-8 text-white/80 hover:text-white hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Logout</span>
                </Button>
              </div>
            </>
          ) : (
            <>
              {navLink("/customer/track", "Track My Request", <Search className="h-4 w-4" />)}
              {navLink("/customer/login", "Login", <LogIn className="h-4 w-4" />)}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
