"use client";

import {
  Anchor as PopoverAnchorPrimitive,
  Content as PopoverContentPrimitive,
  Portal as PopoverPortalPrimitive,
  Root as PopoverRootPrimitive,
  Trigger as PopoverTriggerPrimitive,
} from "@radix-ui/react-popover";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverRootPrimitive>) {
  return <PopoverRootPrimitive data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverTriggerPrimitive>) {
  return <PopoverTriggerPrimitive data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverContentPrimitive>) {
  return (
    <PopoverPortalPrimitive>
      <PopoverContentPrimitive
        align={align}
        className={cn(
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 bg-popover text-popover-foreground data-[state=closed]:animate-out data-[state=open]:animate-in z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className
        )}
        data-slot="popover-content"
        sideOffset={sideOffset}
        {...props}
      />
    </PopoverPortalPrimitive>
  );
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverAnchorPrimitive>) {
  return <PopoverAnchorPrimitive data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
