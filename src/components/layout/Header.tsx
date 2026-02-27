"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Menu, CalendarDays, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeLabel = datePreset === "custom"
    ? format(parseISO(selectedDate), "MMM dd, yyyy")
    : PRESETS.find((p) => p.key === datePreset)?.label || "Select Date";

  const parsedDate = selectedDate ? parseISO(selectedDate) : undefined;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCustomDate(format(date, "yyyy-MM-dd"));
      setCalendarOpen(false);
      setMobileOpen(false);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card/95 backdrop-blur px-4 gap-3 sticky top-0 z-40">
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

      <div className="flex justify-end items-center gap-2">
        {/* Desktop View: Styled Segmented Control + Date Picker */}
        <div className="hidden md:flex items-center bg-muted/40 p-1 border rounded-full shadow-sm">
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDatePreset(key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap ${datePreset === key
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
            >
              {label}
            </button>
          ))}
          <div className="w-px h-5 bg-border mx-2" />
          <div className="relative flex items-center group">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={`pl-3 pr-4 h-8 text-xs font-medium rounded-full border-none shadow-none hover:bg-muted/50 focus-visible:ring-0 ${datePreset === "custom"
                      ? "bg-background shadow-sm ring-1 ring-border text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <CalendarDays className="h-3.5 w-3.5 mr-2" />
                  {datePreset === "custom" ? format(parseISO(selectedDate), "MMM dd, yyyy") : "Custom Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0 rounded-xl" autoFocus={false}>
                <Calendar
                  mode="single"
                  selected={parsedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Mobile View: Popover dropdown */}
        <div className="md:hidden">
          <Popover open={mobileOpen} onOpenChange={setMobileOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 rounded-full px-4 border-dashed shadow-sm gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span className="text-xs font-medium">{activeLabel}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-2 rounded-xl">
              <div className="grid gap-1 mb-2">
                {PRESETS.map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={datePreset === key ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start text-xs font-medium"
                    onClick={() => {
                      setDatePreset(key);
                      setMobileOpen(false);
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2">
                  Custom Date
                </span>
                <Calendar
                  mode="single"
                  selected={parsedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="p-0 mt-1"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
