"use client";

import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ServiceCardProps {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
}

export function ServiceCard({ icon: Icon, label, description, onClick }: ServiceCardProps) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 active:scale-[0.98]"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="font-semibold text-sm">{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        </div>
      </CardContent>
    </Card>
  );
}
