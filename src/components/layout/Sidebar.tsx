"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import {
  LayoutDashboard,
  Users,
  FileText,
  Megaphone,
  Wallet,
  ArrowLeftRight,
  MessageSquareText,
  X,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const icons = {
  LayoutDashboard,
  Users,
  FileText,
  Megaphone,
  Wallet,
  ArrowLeftRight,
  MessageSquareText,
} as const;

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" as const, description: "Daily Reports" },
  { href: "/cre", label: "CRE", icon: "Users" as const, description: "Customer Relations" },
  { href: "/lpo", label: "LPO", icon: "FileText" as const, description: "Loan Processing" },
  { href: "/abm", label: "ABM", icon: "Megaphone" as const, description: "Marketing" },
  { href: "/cashier", label: "Cashier", icon: "Wallet" as const, description: "Cash Management" },
  { href: "/accountant", label: "Accountant", icon: "ArrowLeftRight" as const, description: "Transfers & Bank Book" },
  { href: "/tickets", label: "Tickets", icon: "MessageSquareText" as const, description: "Customer Requests" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { tickets } = useApp();
  const openTicketCount = tickets.filter((t) => t.status === "Open" || t.status === "In Progress").length;

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
          "fixed left-0 top-0 z-50 flex h-full flex-col border-r bg-sidebar transition-all duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className={cn("flex h-16 items-center border-b px-4", collapsed ? "justify-center" : "justify-between")}>
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              V
            </div>
            {!collapsed && <span className="text-lg font-bold tracking-tight">VIBGYOR</span>}
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 space-y-1 p-3", collapsed && "px-2")}>
          {NAV_ITEMS.map((item) => {
            const Icon = icons[item.icon];
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            const showBadge = item.href === "/tickets" && openTicketCount > 0;

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-[3px] before:rounded-full before:bg-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.label}</span>
                      {showBadge && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold bg-destructive text-destructive-foreground">
                          {openTicketCount}
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "text-xs",
                        active ? "text-primary/70" : "text-muted-foreground/70"
                      )}
                    >
                      {item.description}
                    </div>
                  </div>
                )}
                {collapsed && showBadge && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {openTicketCount}
                  </span>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs opacity-70">{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.href}>{linkContent}</div>;
          })}
        </nav>

        {/* Footer with collapse toggle */}
        <div className={cn("border-t p-4", collapsed && "p-2")}>
          {!collapsed && (
            <p className="text-xs text-muted-foreground mb-2">VIBGYOR Bank Operations</p>
          )}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className={cn("w-full", collapsed && "mx-auto")}
            onClick={onToggleCollapse}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                <span className="ml-2">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}
