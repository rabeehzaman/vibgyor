"use client";

import { LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function KPICard({ label, value, icon: Icon, iconColor = "bg-primary/10 text-primary", className }: KPICardProps) {
  return (
    <div
      className={cn(
        "animate-fade-in-up flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200",
        className
      )}
    >
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", iconColor)}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">
          <AnimatedNumber value={value} />
        </p>
      </div>
    </div>
  );
}
