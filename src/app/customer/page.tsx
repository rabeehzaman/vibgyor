"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useApp } from "@/context/AppContext";
import { TICKET_TYPE_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Search, FileText, Clock } from "lucide-react";
import { format } from "date-fns";

export default function CustomerDashboard() {
  const { customer, isLoading } = useCustomerAuth();
  const { tickets } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !customer) router.replace("/customer/login");
  }, [isLoading, customer, router]);

  if (isLoading || !customer) return null;

  const myTickets = tickets
    .filter((t) => t.customerMobile === customer.mobile)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const openCount = myTickets.filter((t) => t.status === "Open" || t.status === "In Progress").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Welcome Section */}
      <div className="animate-fade-in relative mb-8 overflow-hidden rounded-xl bg-gradient-to-br from-[oklch(0.40_0.22_265)] to-[oklch(0.50_0.20_290)] p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold md:text-3xl">
            Welcome, {customer.name}
          </h1>
          <p className="mt-1 text-white/70 text-sm">
            Account: {customer.accountNumber}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="secondary" size="sm">
              <Link href="/customer/new-request">
                <Plus className="mr-1.5 h-4 w-4" /> New Request
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
              <Link href="/customer/track">
                <Search className="mr-1.5 h-4 w-4" /> Track by Reference
              </Link>
            </Button>
          </div>
        </div>
        <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/5" />
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{myTickets.length}</p>
              <p className="text-xs text-muted-foreground">Total Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openCount}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <FileText className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{myTickets.length - openCount}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">My Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {myTickets.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">No requests yet</p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/customer/new-request">Create your first request</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {myTickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/customer/ticket/${t.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {t.referenceNumber}
                      </span>
                      <StatusBadge status={t.status} dot />
                    </div>
                    <p className="mt-0.5 text-sm font-medium truncate">
                      {TICKET_TYPE_LABELS[t.type]}
                    </p>
                  </div>
                  <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                    {format(new Date(t.createdAt), "dd MMM yyyy")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
