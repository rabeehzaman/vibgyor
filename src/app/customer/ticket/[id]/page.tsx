"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useApp } from "@/context/AppContext";
import { TICKET_TYPE_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send } from "lucide-react";
import { format } from "date-fns";

export default function CustomerTicketDetailPage() {
  const { customer, isLoading } = useCustomerAuth();
  const { tickets, addTicketReply } = useApp();
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;
  const [followUp, setFollowUp] = useState("");

  useEffect(() => {
    if (!isLoading && !customer) router.replace("/customer/login");
  }, [isLoading, customer, router]);

  if (isLoading || !customer) return null;

  const ticket = tickets.find((t) => t.id === ticketId);

  if (!ticket || ticket.customerMobile !== customer.mobile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href="/customer"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Request not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleFollowUp = () => {
    if (!followUp.trim()) return;
    addTicketReply(ticket.id, {
      id: `reply_${Date.now()}`,
      ticketId: ticket.id,
      message: followUp.trim(),
      author: "customer",
      authorName: customer.name,
      timestamp: new Date().toISOString(),
    });
    setFollowUp("");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/customer"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-mono">{ticket.referenceNumber}</CardTitle>
              <StatusBadge status={ticket.status} dot />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Service Type</p>
                <p className="font-medium">{TICKET_TYPE_LABELS[ticket.type]}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Created</p>
                <p className="font-medium">
                  {format(new Date(ticket.createdAt), "dd MMM yyyy, hh:mm a")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Name</p>
                <p className="font-medium">{ticket.customerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Account</p>
                <p className="font-medium">{ticket.accountNumber}</p>
              </div>
            </div>

            {Object.keys(ticket.details).length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2">Request Details</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(ticket.details).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-muted-foreground text-xs capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </p>
                      <p className="font-medium">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ticket.assignedToName && (
              <div className="border-t pt-3 text-sm">
                <p className="text-muted-foreground text-xs">Assigned To</p>
                <p className="font-medium">{ticket.assignedToName}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversation Thread */}
        {ticket.replies.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ticket.replies.map((reply) => (
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
        {ticket.status !== "Closed" && (
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
                <Button
                  onClick={handleFollowUp}
                  disabled={!followUp.trim()}
                  size="icon"
                  className="h-auto"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
