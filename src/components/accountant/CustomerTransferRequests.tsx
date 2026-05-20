"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Ticket } from "@/lib/types";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Inbox,
  ArrowLeftRight,
  User,
  ShieldCheck,
  MessageSquare,
  Send,
} from "lucide-react";

function getDetail(t: Ticket, key: string): string {
  const v = t.details[key];
  return v == null ? "" : String(v);
}

function getAmount(t: Ticket): number {
  const v = t.details.amount;
  return typeof v === "number" ? v : Number(v) || 0;
}

interface Props {
  staffId?: string;
  staffName?: string;
}

export default function CustomerTransferRequests({ staffId, staffName }: Props) {
  const { tickets, updateTicketStatus, assignTicket, addTicketReply } = useApp();
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");

  const transferTickets = useMemo(
    () =>
      tickets
        .filter((t) => t.type === "TransferRequest")
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [tickets]
  );

  const openTickets = transferTickets.filter(
    (t) => t.status === "Open" || t.status === "In Progress"
  );

  const counts = useMemo(
    () => ({
      open: transferTickets.filter((t) => t.status === "Open").length,
      inProgress: transferTickets.filter((t) => t.status === "In Progress").length,
      resolved: transferTickets.filter((t) => t.status === "Resolved").length,
    }),
    [transferTickets]
  );

  const handleStart = (t: Ticket) => {
    if (t.status === "Open") {
      updateTicketStatus(t.id, "In Progress");
      if (staffId && staffName && !t.assignedTo) {
        assignTicket(t.id, staffId, staffName);
      }
    }
    setSelected(t);
  };

  const handleResolve = (t: Ticket) => {
    updateTicketStatus(t.id, "Resolved");
    setSelected((prev) => (prev?.id === t.id ? { ...prev, status: "Resolved" } : prev));
  };

  const handleReply = (t: Ticket) => {
    if (!reply.trim()) return;
    addTicketReply(t.id, {
      id: `reply_${Date.now()}`,
      ticketId: t.id,
      message: reply.trim(),
      author: "staff",
      authorName: staffName ?? "Accountant",
      authorId: staffId,
      timestamp: new Date().toISOString(),
    });
    setReply("");
  };

  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Inbox className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Customer Transfer Requests</CardTitle>
              <p className="text-xs text-muted-foreground">
                Submitted by customers from their app — review and process them.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">
              {counts.open} Open
            </Badge>
            <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
              {counts.inProgress} In Progress
            </Badge>
            <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
              {counts.resolved} Resolved
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {openTickets.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No pending customer transfer requests.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {openTickets.slice(0, 8).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleStart(t)}
                className="text-left rounded-lg border bg-card p-3 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {t.referenceNumber}
                    </p>
                    <p className="mt-0.5 truncate font-semibold text-sm">
                      {t.customerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      From: {getDetail(t, "fromAccount") || t.accountNumber}
                    </p>
                    <p className="mt-0.5 truncate text-xs">
                      → {getDetail(t, "toName")} ({getDetail(t, "toIFSC")})
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold">
                      ₹{getAmount(t).toLocaleString("en-IN")}
                    </p>
                    <StatusBadge status={t.status} dot />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{format(new Date(t.createdAt), "dd MMM, hh:mm a")}</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> PIN verified
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {transferTickets.length > 8 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Showing 8 of {transferTickets.length} requests. View all in the
            Tickets dashboard.
          </p>
        )}
      </CardContent>

      <Dialog
        open={selected !== null}
        onOpenChange={(v) => {
          if (!v) {
            setSelected(null);
            setReply("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                  Customer Transfer Request
                </DialogTitle>
                <DialogDescription className="font-mono">
                  {selected.referenceNumber}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="rounded-lg border p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 font-semibold">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {selected.customerName}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({selected.customerMobile})
                    </span>
                  </div>
                  <DetailRow
                    label="From"
                    value={getDetail(selected, "fromAccount") || selected.accountNumber}
                    mono
                  />
                  <DetailRow
                    label="Beneficiary"
                    value={`${getDetail(selected, "toName")}${
                      getDetail(selected, "nickname")
                        ? ` (${getDetail(selected, "nickname")})`
                        : ""
                    }`}
                  />
                  <DetailRow
                    label="Account No."
                    value={getDetail(selected, "toAccount")}
                    mono
                  />
                  <DetailRow
                    label="IFSC"
                    value={getDetail(selected, "toIFSC")}
                    mono
                  />
                  {getDetail(selected, "toBank") && (
                    <DetailRow
                      label="Bank"
                      value={getDetail(selected, "toBank")}
                    />
                  )}
                  <div className="border-t pt-2">
                    <DetailRow
                      label="Amount"
                      value={`₹${getAmount(selected).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}`}
                      strong
                    />
                  </div>
                  <p className="pt-1 text-xs text-muted-foreground">
                    Submitted{" "}
                    {format(new Date(selected.createdAt), "dd MMM yyyy, hh:mm a")}
                  </p>
                </div>

                {/* Conversation thread */}
                {selected.replies.length > 0 && (
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      <MessageSquare className="h-3 w-3" /> Conversation
                    </p>
                    <div className="space-y-2">
                      {selected.replies.map((r) => (
                        <div
                          key={r.id}
                          className={`rounded p-2 text-sm ${
                            r.author === "staff"
                              ? "bg-primary/5 border border-primary/20"
                              : "bg-muted"
                          }`}
                        >
                          <div className="mb-0.5 flex justify-between text-[10px] text-muted-foreground">
                            <span className="font-semibold">
                              {r.author === "staff" ? `${r.authorName} (Staff)` : r.authorName}
                            </span>
                            <span>
                              {format(new Date(r.timestamp), "dd MMM, hh:mm a")}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{r.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reply box */}
                {selected.status !== "Closed" && selected.status !== "Resolved" && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold">
                      Reply to customer
                    </p>
                    <div className="flex gap-2">
                      <Textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="e.g. Transfer initiated, will reflect in 2 hours."
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleReply(selected)}
                        disabled={!reply.trim()}
                        size="icon"
                        className="h-auto"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelected(null);
                      setReply("");
                    }}
                  >
                    Close
                  </Button>
                  {selected.status !== "Resolved" && selected.status !== "Closed" && (
                    <Button
                      className="flex-1"
                      onClick={() => handleResolve(selected)}
                    >
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DetailRow({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`${mono ? "font-mono" : ""} ${strong ? "text-lg font-bold" : "font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}
