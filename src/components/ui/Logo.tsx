import * as React from "react";

import { cn } from "@/lib/utils";

export interface LogoProps extends Omit<React.SVGProps<SVGSVGElement>, "width" | "height"> {
  size?: number;
}

/**
 * AgriConnect brand mark — a leaf-location-pin with a golden AI sparkle
 * and crop furrows, on the forest-green app tile.
 */
function Logo({ size = 48, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      role="img"
      aria-label="AgriConnect"
      className={cn("shrink-0", className)}
      {...props}
    >
      <rect width="512" height="512" rx="112" fill="#2E7D32" />

      {/* Leaf-pin body with circular AI node cut out */}
      <path
        fill="#FFFFFF"
        fillRule="evenodd"
        d="M 228 138
           C 176 158, 150 214, 150 276
           C 150 344, 204 388, 256 414
           C 308 388, 362 344, 362 276
           C 362 214, 336 158, 284 138
           C 276 146, 264 153, 256 153
           C 248 153, 236 146, 228 138
           Z
           M 256 214
           a 38 38 0 1 0 0 76
           a 38 38 0 1 0 0 -76"
      />

      {/* Emerald midrib */}
      <line x1="256" y1="300" x2="256" y2="408" stroke="#16A34A" strokeWidth="8" strokeLinecap="round" />

      {/* Golden AI sparkle */}
      <path
        fill="#F59E0B"
        d="M 256 222
           Q 262 244, 286 252
           Q 262 260, 256 284
           Q 250 260, 226 252
           Q 250 244, 256 222
           Z"
      />

      {/* Crop furrows */}
      <line x1="182" y1="462" x2="330" y2="462" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" opacity="0.92" />
      <line x1="202" y1="481" x2="310" y2="481" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" opacity="0.62" />
      <line x1="222" y1="498" x2="290" y2="498" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" opacity="0.38" />
    </svg>
  );
}

export { Logo };
