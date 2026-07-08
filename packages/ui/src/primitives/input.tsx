import * as React from "react";

import { cn } from "../lib/utils";

/**
 * Input — shadcn primitive vendored per D1.
 * Standard <input/> wrapper with the v1 design tokens. `min-h-[--h-touch]`
 * keeps tap targets >= 44px for mobile (spec: ganaweb-design.md v1 §Touch).
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-md border border-input bg-card px-3 py-2 text-support",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
