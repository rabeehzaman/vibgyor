"use client";

import { Ticket } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Inbox, Clock, CheckCircle2, TicketCheck } from "lucide-react";
import { format } from "date-fns";

interface TicketStatsProps {
  tickets: Ticket[];
}

export function TicketStats({ tickets }: TicketStatsProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const total = tickets.length;
  const open = tickets.filter((t) => t.status === "Open").length;
  const inProgress = tickets.filter((t) => t.status === "In Progress").length;
  const resolvedToday = tickets.filter(
    (t) => t.resolvedAt && t.resolvedAt.startsWith(today)
  ).length;

  const stats = [
    { label: "Total", value: total, icon: TicketCheck, color: "text-blue-600 bg-blue-100" },
    { label: "Open", value: open, icon: Inbox, color: "text-orange-600 bg-orange-100" },
    { label: "In Progress", value: inProgress, icon: Clock, color: "text-yellow-600 bg-yellow-100" },
    { label: "Resolved Today", value: resolvedToday, icon: CheckCircle2, color: "text-green-600 bg-green-100" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
