"use client";

import { Ticket } from "@/lib/types";
import { TICKET_TYPE_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  Open: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  "In Progress": "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  Resolved: "bg-green-100 text-green-700 hover:bg-green-100",
  Closed: "bg-gray-100 text-gray-700 hover:bg-gray-100",
};

const priorityColors: Record<string, string> = {
  Low: "bg-slate-100 text-slate-600 hover:bg-slate-100",
  Medium: "bg-blue-100 text-blue-600 hover:bg-blue-100",
  High: "bg-orange-100 text-orange-600 hover:bg-orange-100",
  Urgent: "bg-red-100 text-red-600 hover:bg-red-100",
};

interface TicketTableProps {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
}

export function TicketTable({ tickets, onSelect }: TicketTableProps) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No tickets found.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-36">Ref #</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="hidden md:table-cell">Customer</TableHead>
            <TableHead className="hidden lg:table-cell">Account</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Priority</TableHead>
            <TableHead className="hidden lg:table-cell">Assigned To</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id} className="cursor-pointer" onClick={() => onSelect(ticket)}>
              <TableCell className="font-mono text-xs font-medium">{ticket.referenceNumber}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs font-normal whitespace-nowrap">
                  {TICKET_TYPE_LABELS[ticket.type]}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">{ticket.customerName}</TableCell>
              <TableCell className="hidden lg:table-cell font-mono text-xs">{ticket.accountNumber}</TableCell>
              <TableCell>
                <Badge className={`text-xs ${statusColors[ticket.status]}`}>{ticket.status}</Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge className={`text-xs ${priorityColors[ticket.priority]}`}>{ticket.priority}</Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm">
                {ticket.assignedToName || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                {format(new Date(ticket.createdAt), "dd MMM, hh:mm a")}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
