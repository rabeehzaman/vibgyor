import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_VARIANT_MAP: Record<string, "statusOpen" | "statusInProgress" | "statusResolved" | "statusClosed"> = {
  Open: "statusOpen",
  "In Progress": "statusInProgress",
  Resolved: "statusResolved",
  Closed: "statusClosed",
};

const PRIORITY_VARIANT_MAP: Record<string, "priorityLow" | "priorityMedium" | "priorityHigh" | "priorityUrgent"> = {
  Low: "priorityLow",
  Medium: "priorityMedium",
  High: "priorityHigh",
  Urgent: "priorityUrgent",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  Open: "bg-blue-500",
  "In Progress": "bg-yellow-500",
  Resolved: "bg-green-500",
  Closed: "bg-gray-400",
};

const PRIORITY_DOT_COLORS: Record<string, string> = {
  Low: "bg-slate-400",
  Medium: "bg-blue-500",
  High: "bg-orange-500",
  Urgent: "bg-red-500",
};

interface StatusBadgeProps {
  status: string;
  dot?: boolean;
  className?: string;
}

export function StatusBadge({ status, dot = false, className }: StatusBadgeProps) {
  const variant = STATUS_VARIANT_MAP[status] ?? "statusOpen";
  return (
    <Badge variant={variant} className={cn("text-xs", className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT_COLORS[status] ?? "bg-gray-400")} />}
      {status}
    </Badge>
  );
}

interface PriorityBadgeProps {
  priority: string;
  dot?: boolean;
  className?: string;
}

export function PriorityBadge({ priority, dot = false, className }: PriorityBadgeProps) {
  const variant = PRIORITY_VARIANT_MAP[priority] ?? "priorityMedium";
  return (
    <Badge variant={variant} className={cn("text-xs", className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT_COLORS[priority] ?? "bg-gray-400")} />}
      {priority}
    </Badge>
  );
}
