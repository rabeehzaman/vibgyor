"use client";

import { useState } from "react";
import { STAFF_MEMBERS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, CheckCircle2 } from "lucide-react";

interface TicketReplyFormProps {
  onSendReply: (message: string, staffId: string, staffName: string) => void;
  onReplyAndResolve: (message: string, staffId: string, staffName: string) => void;
}

export function TicketReplyForm({ onSendReply, onReplyAndResolve }: TicketReplyFormProps) {
  const [message, setMessage] = useState("");
  const [staffId, setStaffId] = useState("");

  const staff = staffId ? STAFF_MEMBERS.find((s) => s.id === staffId) : null;

  const handleSend = () => {
    if (!message.trim() || !staff) return;
    onSendReply(message.trim(), staff.id, staff.name);
    setMessage("");
  };

  const handleResolve = () => {
    if (!message.trim() || !staff) return;
    onReplyAndResolve(message.trim(), staff.id, staff.name);
    setMessage("");
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <Select value={staffId} onValueChange={setStaffId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select staff to reply as..." />
        </SelectTrigger>
        <SelectContent>
          {STAFF_MEMBERS.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name} ({s.department})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your reply to the customer..."
        rows={3}
      />
      <div className="flex gap-2">
        <Button
          onClick={handleSend}
          disabled={!message.trim() || !staffId}
          className="flex-1"
          variant="outline"
        >
          <Send className="h-4 w-4 mr-1.5" /> Send Reply
        </Button>
        <Button
          onClick={handleResolve}
          disabled={!message.trim() || !staffId}
          className="flex-1"
        >
          <CheckCircle2 className="h-4 w-4 mr-1.5" /> Reply & Resolve
        </Button>
      </div>
    </div>
  );
}
