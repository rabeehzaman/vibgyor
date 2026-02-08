"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  Megaphone,
  Wallet,
  ArrowLeftRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const icons = {
  LayoutDashboard,
  Users,
  FileText,
  Megaphone,
  Wallet,
  ArrowLeftRight,
} as const;

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" as const, description: "Daily Reports" },
  { href: "/cre", label: "CRE", icon: "Users" as const, description: "Customer Relations" },
  { href: "/lpo", label: "LPO", icon: "FileText" as const, description: "Loan Processing" },
  { href: "/abm", label: "ABM", icon: "Megaphone" as const, description: "Marketing" },
  { href: "/cashier", label: "Cashier", icon: "Wallet" as const, description: "Cash Management" },
  { href: "/accountant", label: "Accountant", icon: "ArrowLeftRight" as const, description: "Fund Transfers" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r bg-card transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              V
            </div>
            <span className="text-lg font-bold tracking-tight">VIBGYOR</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = icons[item.icon];
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div
                    className={cn(
                      "text-xs",
                      active ? "text-primary-foreground/70" : "text-muted-foreground/70"
                    )}
                  >
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4 text-xs text-muted-foreground">
          VIBGYOR Bank Operations
        </div>
      </aside>
    </>
  );
}
