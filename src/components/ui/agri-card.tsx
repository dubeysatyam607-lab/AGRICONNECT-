import * as React from "react";
import { cn } from "@/lib/utils";

interface AgriCardProps extends React.HTMLAttributes<HTMLDivElement> {
  highlight?: boolean;
}

const AgriCard = React.forwardRef<HTMLDivElement, AgriCardProps>(
  ({ className, highlight, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-card rounded-2xl shadow-card border border-border p-4 transition-all duration-200",
        highlight && "border-primary/30 shadow-glow",
        className
      )}
      {...props}
    />
  )
);
AgriCard.displayName = "AgriCard";

export { AgriCard };
