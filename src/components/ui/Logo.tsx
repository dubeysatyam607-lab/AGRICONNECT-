import * as React from "react";
import { cn } from "@/lib/utils";
import logoFull from "@/assets/logo_full.png";
import logoIcon from "@/assets/logo_icon.png";

export interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number;
  variant?: 'full' | 'icon';
}

/**
 * Reusable AgriConnect brand logo component.
 * Uses the full AgriConnect logo + wordmark for desktop/branding variants,
 * and the icon-only version for compact/mobile areas.
 */
function Logo({ size, variant = 'icon', className, alt = "AgriConnect", ...props }: LogoProps) {
  const src = variant === 'full' ? logoFull : logoIcon;
  const width = size;
  const height = variant === 'icon' ? size : undefined;

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn("shrink-0 object-contain", className)}
      style={{
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
      }}
      {...props}
    />
  );
}

export { Logo };
