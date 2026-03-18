"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Ticket } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketStats } from "@/components/tickets/TicketStats";
import { TicketFilters } from "@/components/tickets/TicketFilters";
import { TicketTable } from "@/components/tickets/TicketTable";

const PRIORITY_ORDER: Record<string, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

export default function TicketsPage() {
  const { tickets } = useApp();
  const router = useRouter();

  const [statusTab, setStatusTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    let result = [...tickets];

    if (statusTab !== "all") {
      result = result.filter((t) => t.status === statusTab);
    }
    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }
    if (assigneeFilter === "unassigned") {
      result = result.filter((t) => !t.assignedTo);
    } else if (assigneeFilter !== "all") {
      result = result.filter((t) => t.assignedTo === assigneeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.referenceNumber.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q) ||
          t.accountNumber.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const pDiff = (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [tickets, statusTab, typeFilter, assigneeFilter, searchQuery]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tickets</h1>

      <TicketStats tickets={tickets} />

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="Open">Open</TabsTrigger>
          <TabsTrigger value="In Progress">In Progress</TabsTrigger>
          <TabsTrigger value="Resolved">Resolved</TabsTrigger>
          <TabsTrigger value="Closed">Closed</TabsTrigger>
        </TabsList>
      </Tabs>

      <TicketFilters
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        assigneeFilter={assigneeFilter}
        setAssigneeFilter={setAssigneeFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <TicketTable tickets={filtered} onSelect={(t) => router.push(`/tickets/${t.id}`)} />
    </div>
  );
}
