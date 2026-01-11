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
}

export function TerminalPanel({
  title,
  children,
  className = "",
  scrollable = false,
  headerAction,
}: TerminalPanelProps) {
  return (
    <Card
      className={cn(
        "border border-brew-green bg-terminal-bg flex flex-col rounded-none shadow-none",
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
          "p-3 flex-1",
          scrollable ? "overflow-y-auto custom-scrollbar" : "overflow-hidden"
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}
