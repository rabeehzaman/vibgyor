"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function CustomerHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-[oklch(0.40_0.22_265)] to-[oklch(0.50_0.20_290)] shadow-lg">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/customer" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white text-sm font-bold backdrop-blur-sm">
            V
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">VIBGYOR</span>
            <span className="ml-1.5 text-xs text-white/70">Customer Services</span>
          </div>
        </Link>
        <Link
          href="/customer/track"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/customer/track"
              ? "bg-white/20 text-white backdrop-blur-sm"
              : "text-white/80 hover:bg-white/10 hover:text-white"
          )}
        >
          <Search className="h-4 w-4" />
          Track My Request
        </Link>
      </div>
    </header>
  );
}
