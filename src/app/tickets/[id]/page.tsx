"use client";

import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { TICKET_TYPE_LABELS, TICKET_TYPE_DEPARTMENT, STAFF_MEMBERS } from "@/lib/constants";
import { TicketStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketReplyForm } from "@/components/tickets/TicketReplyForm";
import { format } from "date-fns";
import { ArrowLeft, User, Phone, CreditCard, Clock, Tag, AlertTriangle } from "lucide-react";

const statusColors: Record<string, string> = {
  Open: "bg-blue-100 text-blue-700",
  "In Progress": "bg-yellow-100 text-yellow-700",
  Resolved: "bg-green-100 text-green-700",
  Closed: "bg-gray-100 text-gray-700",
};

const priorityColors: Record<string, string> = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-blue-100 text-blue-600",
  High: "bg-orange-100 text-orange-600",
  Urgent: "bg-red-100 text-red-600",
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { tickets, updateTicketStatus, assignTicket, addTicketReply } = useApp();

  const ticket = tickets.find((t) => t.id === id);

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Ticket not found.</p>
        <Button variant="outline" onClick={() => router.push("/tickets")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Tickets
        </Button>
      </div>
    );
  }

  const suggestedDept = TICKET_TYPE_DEPARTMENT[ticket.type];
  const suggestedStaff = STAFF_MEMBERS.filter((s) => s.department === suggestedDept);

  const nextStatus: Record<string, TicketStatus | null> = {
    Open: "In Progress",
    "In Progress": "Resolved",
    Resolved: "Closed",
    Closed: null,
  };
  const next = nextStatus[ticket.status];

  const handleReply = (message: string, staffId: string, staffName: string) => {
    addTicketReply(ticket.id, {
      id: `reply_${Date.now()}`,
      ticketId: ticket.id,
      message,
      author: "staff",
      authorName: staffName,
      authorId: staffId,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/tickets")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold font-mono">{ticket.referenceNumber}</h1>
            <Badge className={statusColors[ticket.status]}>{ticket.status}</Badge>
            <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {TICKET_TYPE_LABELS[ticket.type]} &middot; Created {format(new Date(ticket.createdAt), "dd MMM yyyy, hh:mm a")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Conversation */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer message / details */}
          {Object.keys(ticket.details).length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Request Details</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(ticket.details).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-muted-foreground text-xs capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                      <p className="font-medium">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conversation thread */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Conversation</h2>
            {ticket.replies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No replies yet.</p>
            ) : (
              ticket.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`rounded-lg p-4 text-sm ${
                    reply.author === "staff"
                      ? "bg-primary/5 border border-primary/20"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-xs">
                      {reply.author === "staff" ? `${reply.authorName} (Staff)` : `${reply.authorName} (Customer)`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(reply.timestamp), "dd MMM, hh:mm a")}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{reply.message}</p>
                </div>
              ))
            )}
          </div>

          {/* Reply Form */}
          {ticket.status !== "Closed" && (
            <TicketReplyForm
              onSendReply={(msg, sId, sName) => handleReply(msg, sId, sName)}
              onReplyAndResolve={(msg, sId, sName) => {
                handleReply(msg, sId, sName);
                updateTicketStatus(ticket.id, "Resolved");
              }}
            />
          )}
        </div>

        {/* Right column — Info & Actions */}
        <div className="space-y-4">
          {/* Customer Info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{ticket.customerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{ticket.customerMobile}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-mono">{ticket.accountNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs">{format(new Date(ticket.createdAt), "dd MMM yyyy, hh:mm a")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assign */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Assign to Staff
                {suggestedStaff.length > 0 && (
                  <span className="ml-1 normal-case font-normal">(suggested: {suggestedDept})</span>
                )}
              </p>
              <Select
                value={ticket.assignedTo || ""}
                onValueChange={(v) => {
                  const s = STAFF_MEMBERS.find((st) => st.id === v);
                  if (s) assignTicket(ticket.id, s.id, s.name);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff..." />
                </SelectTrigger>
                <SelectContent>
                  {suggestedStaff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.department})
                    </SelectItem>
                  ))}
                  {suggestedStaff.length > 0 && <Separator className="my-1" />}
                  {STAFF_MEMBERS.filter((s) => s.department !== suggestedDept).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Status Action */}
          {next && (
            <Button
              className="w-full"
              onClick={() => updateTicketStatus(ticket.id, next)}
            >
              Move to {next}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
