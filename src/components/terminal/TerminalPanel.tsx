"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TerminalPanelProps {
  /** Title of the panel */
  title: string;
  /** Panel content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Action component to display on the right side of the header */
  headerAction?: React.ReactNode;
  /** Whether the content is scrollable */
  scrollable?: boolean;
}

export function TerminalPanel({
  title,
  children,
  className = "",
  scrollable = false,
  headerAction,
}: TerminalPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col glass-panel rounded-2xl overflow-hidden h-full w-full",
        className
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5 backdrop-blur-md">
        <h4 className="text-sm font-semibold text-white tracking-wide uppercase">
          {title}
        </h4>
        {headerAction && <div>{headerAction}</div>}
      </div>

      <div
        className={cn("flex-1 relative", scrollable ? "overflow-hidden" : "")}
      >
        <div
          className={cn(
            "h-full w-full",
            scrollable ? "overflow-y-auto custom-scrollbar" : "overflow-hidden"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
