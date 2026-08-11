import * as React from "react";
import { cn } from "@/lib/utils";

type StatusType = "Available" | "Busy" | "Maintenance" | "up" | "down" | "stable";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  Available: "bg-accent text-accent-foreground",
  Busy: "bg-destructive/10 text-destructive",
  Maintenance: "bg-secondary/20 text-secondary-foreground",
  up: "bg-accent text-accent-foreground",
  down: "bg-destructive/10 text-destructive",
  stable: "bg-muted text-muted-foreground",
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  return (
    <span
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-semibold",
        statusStyles[status] || "bg-muted text-muted-foreground",
        className
      )}
    >
      {status}
    </span>
  );
};

export { StatusBadge };
