import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const agriButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "gradient-hero text-primary-foreground shadow-md hover:shadow-lg hover:brightness-110",
        secondary: "bg-card text-primary border border-primary/20 hover:bg-accent",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border text-foreground hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        magic: "gradient-magic text-primary-foreground shadow-md hover:shadow-lg hover:brightness-110",
        warm: "gradient-warm text-primary-foreground shadow-md hover:shadow-lg hover:brightness-110",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface AgriButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof agriButtonVariants> {}

const AgriButton = React.forwardRef<HTMLButtonElement, AgriButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(agriButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
AgriButton.displayName = "AgriButton";

export { AgriButton, agriButtonVariants };
