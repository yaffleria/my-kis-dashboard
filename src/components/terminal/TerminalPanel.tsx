"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface TerminalPanelProps {
  /** 패널 타이틀 */
  title: string;
  /** 패널 콘텐츠 */
  children: React.ReactNode;
  /** 추가 CSS 클래스 */
  className?: string;
  /** 헤더 우측에 표시할 액션 컴포넌트 */
  headerAction?: React.ReactNode;
  /** 스크롤 가능 여부 */
  scrollable?: boolean;
  /** 로딩 상태 여부 */
  isLoading?: boolean;
}

export function TerminalPanel({
  title,
  children,
  className = "",
  scrollable = false,
  headerAction,
  isLoading = false,
}: TerminalPanelProps) {
  return (
    <Card
      className={cn(
        "border border-brew-green bg-terminal-bg flex flex-col rounded-none shadow-none relative",
        className
      )}
    >
      <CardHeader className="border-b border-brew-green bg-brew-green/10 p-1 px-3 shrink-0 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-brew-green font-bold text-sm tracking-wide uppercase">
          {title}
        </CardTitle>
        {headerAction && <div>{headerAction}</div>}
      </CardHeader>
      <CardContent
        className={cn(
          "p-3 flex-1 relative min-h-[100px]",
          scrollable ? "overflow-y-auto custom-scrollbar" : "overflow-hidden"
        )}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-terminal-bg/80 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brew-green border-t-transparent" />
              <span className="text-xs text-brew-green animate-pulse">
                LOADING...
              </span>
            </div>
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
