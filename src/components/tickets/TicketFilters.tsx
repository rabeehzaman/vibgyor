"use client";

import { TicketType } from "@/lib/types";
import { TICKET_TYPES, TICKET_TYPE_LABELS } from "@/lib/constants";
import { STAFF_MEMBERS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface TicketFiltersProps {
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  assigneeFilter: string;
  setAssigneeFilter: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}

export function TicketFilters({
  typeFilter,
  setTypeFilter,
  assigneeFilter,
  setAssigneeFilter,
  searchQuery,
  setSearchQuery,
}: TicketFiltersProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search ref#, name, or account..."
          className="pl-9"
        />
      </div>
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {TICKET_TYPES.map((t) => (
            <SelectItem key={t} value={t}>{TICKET_TYPE_LABELS[t as TicketType]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All Staff" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Staff</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {STAFF_MEMBERS.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
