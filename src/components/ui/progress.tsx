"use client";

import {
  Indicator as ProgressIndicatorPrimitive,
  Root as ProgressRootPrimitive,
} from "@radix-ui/react-progress";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressRootPrimitive>) {
  return (
    <ProgressRootPrimitive
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      data-slot="progress"
      {...props}
    >
      <ProgressIndicatorPrimitive
        className="bg-primary h-full w-full flex-1 transition-all"
        data-slot="progress-indicator"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressRootPrimitive>
  );
}

export { Progress };
