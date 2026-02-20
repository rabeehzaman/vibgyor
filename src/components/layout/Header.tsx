"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp, DatePreset } from "@/context/AppContext";

interface HeaderProps {
  onMenuClick: () => void;
}

const PRESETS: { key: Exclude<DatePreset, "custom">; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this-week", label: "This Week" },
  { key: "this-month", label: "This Month" },
];

export function Header({ onMenuClick }: HeaderProps) {
  const { datePreset, selectedDate, setDatePreset, setCustomDate } = useApp();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 gap-3">
      <div className="flex items-center gap-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground hidden sm:block">
          Bank Operations Management
        </h1>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setDatePreset(key)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
              datePreset === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
          </button>
        ))}
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setCustomDate(e.target.value)}
          className="w-36 text-xs h-8"
        />
      </div>
    </header>
  );
}
