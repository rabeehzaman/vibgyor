"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Ticket } from "@/lib/types";
import { TICKET_TYPE_LABELS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, Send, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function TrackPage() {
  const { getTicketByReference, addTicketReply, tickets } = useApp();
  const [refInput, setRefInput] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [followUp, setFollowUp] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = getTicketByReference(refInput.trim().toUpperCase());
    if (found) {
      setTicket(found);
      setNotFound(false);
    } else {
      setTicket(null);
      setNotFound(true);
    }
  };

  const handleFollowUp = () => {
    if (!ticket || !followUp.trim()) return;
    addTicketReply(ticket.id, {
      id: `reply_${Date.now()}`,
      ticketId: ticket.id,
      message: followUp.trim(),
      author: "customer",
      authorName: ticket.customerName,
      timestamp: new Date().toISOString(),
    });
    setFollowUp("");
    // Re-fetch ticket to show updated replies
    const updated = tickets.find((t) => t.id === ticket.id);
    if (updated) setTicket({ ...updated, replies: [...updated.replies, { id: `reply_${Date.now()}`, ticketId: ticket.id, message: followUp.trim(), author: "customer", authorName: ticket.customerName, timestamp: new Date().toISOString() }] });
  };

  // Keep ticket in sync with context
  const liveTicket = ticket ? tickets.find((t) => t.id === ticket.id) || ticket : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/customer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Services
      </Link>

      <h1 className="text-2xl font-bold mb-2">Track Your Request</h1>
      <p className="text-muted-foreground mb-6">
        Enter your reference number to check the status of your request.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <Input
          value={refInput}
          onChange={(e) => setRefInput(e.target.value)}
          placeholder="e.g. VBG-2026-00001"
          className="font-mono"
        />
        <Button type="submit">
          <Search className="h-4 w-4 mr-1.5" /> Search
        </Button>
      </form>

      {notFound && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No request found with reference number &quot;{refInput}&quot;. Please check and try again.
          </CardContent>
        </Card>
      )}

      {liveTicket && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-mono">{liveTicket.referenceNumber}</CardTitle>
                <StatusBadge status={liveTicket.status} dot />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Service Type</p>
                  <p className="font-medium">{TICKET_TYPE_LABELS[liveTicket.type]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Created</p>
                  <p className="font-medium">{format(new Date(liveTicket.createdAt), "dd MMM yyyy, hh:mm a")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Name</p>
                  <p className="font-medium">{liveTicket.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Account</p>
                  <p className="font-medium">{liveTicket.accountNumber}</p>
                </div>
              </div>

              {Object.keys(liveTicket.details).length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2">Request Details</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(liveTicket.details).map(([key, val]) => (
                      <div key={key}>
                        <p className="text-muted-foreground text-xs capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                        <p className="font-medium">{String(val)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {liveTicket.assignedToName && (
                <div className="border-t pt-3 text-sm">
                  <p className="text-muted-foreground text-xs">Assigned To</p>
                  <p className="font-medium">{liveTicket.assignedToName}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation Thread */}
          {liveTicket.replies.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Conversation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {liveTicket.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`rounded-lg p-3 text-sm ${
                      reply.author === "staff"
                        ? "bg-primary/5 border border-primary/20"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs">
                        {reply.author === "staff" ? `${reply.authorName} (Staff)` : "You"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(reply.timestamp), "dd MMM, hh:mm a")}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{reply.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Follow-up */}
          {liveTicket.status !== "Closed" && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-2">Send a Follow-up</p>
                <div className="flex gap-2">
                  <Textarea
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                    placeholder="Type your message..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={handleFollowUp} disabled={!followUp.trim()} size="icon" className="h-auto">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
